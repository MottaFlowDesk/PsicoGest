import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone, Mail, FileText } from "lucide-react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArchivePatientButton } from "@/components/patients/archive-button";
import { DocumentList } from "@/components/patients/document-list";
import { UploadDocumentButton } from "@/components/patients/upload-button";
import { SessionHistory } from "@/components/medical-records/session-history";
import { RecordList } from "@/components/medical-records/record-list";
import { getPatientRecords } from "./records/actions";
import { getInvoices } from "@/app/dashboard/financial/actions";
import { PatientFinancialList } from "@/components/patients/patient-financial-list";
import { EditPatientDialog } from "@/components/patients/edit-patient-dialog";

interface PatientPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function PatientPage({ params }: PatientPageProps) {
    const supabase = await createClient();
    const { id } = await params;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get professional ID from user ID
    const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!professional) {
        console.error("Professional not found for user", user.id);
        redirect("/login"); // or some error page
    }

    const { data: patient, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !patient) {
        notFound();
    }

    // Parallel fetch
    const [records, invoices] = await Promise.all([
        getPatientRecords(patient.id),
        getInvoices(patient.id)
    ]);

    // Calculate age
    const birthDate = new Date(patient.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    // Address helper
    const address = patient.address as any; // JSONB typing
    const fullAddress = address
        ? `${address.street}, ${address.number} ${address.complement ? '- ' + address.complement : ''}, ${address.neighborhood}, ${address.city} - ${address.state}`
        : "Endereço não cadastrado";

    return (
        <div className="space-y-6">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/patients">
                        <Button variant="ghost" size="icon" className="-ml-2">
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Button>
                    </Link>
                    <Avatar className="h-20 w-20 border-2 border-white shadow-sm ring-1 ring-slate-200">
                        <AvatarImage src={patient.avatar_url} />
                        <AvatarFallback className="bg-brand-100 text-brand-700 text-2xl font-bold">
                            {patient.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                        <h2 className="text-2xl font-bold text-slate-900">{patient.full_name}</h2>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                                <span className="font-medium">Idade:</span> {age} anos
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium">Nascimento:</span> {format(birthDate, "dd/MM/yyyy")}
                            </div>
                            {patient.occupation && (
                                <div className="flex items-center gap-1">
                                    <span className="font-medium">Profissão:</span> {patient.occupation}
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <span className="font-medium">CPF:</span> {patient.cpf || "-"}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px] border-l border-slate-100 pl-0 md:pl-6">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {patient.phone}
                        </div>
                        {patient.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail className="h-4 w-4 text-slate-400" />
                                <span className="truncate max-w-[180px]" title={patient.email}>{patient.email}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <EditPatientDialog patient={patient} />
                    <ArchivePatientButton patientId={patient.id} patientName={patient.full_name} />
                </div>
            </div>

            {/* Tabs Content */}
            <Tabs defaultValue="records" className="w-full">
                <TabsList className="w-full justify-start border-b border-slate-200 bg-transparent p-0 rounded-none h-auto">
                    <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-600 px-6 py-3">
                        Visão Geral
                    </TabsTrigger>
                    <TabsTrigger value="records" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-600 px-6 py-3">
                        Prontuário
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-600 px-6 py-3">
                        Agendamentos
                    </TabsTrigger>
                    <TabsTrigger value="financial" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-600 px-6 py-3">
                        Financeiro
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-600 px-6 py-3">
                        Documentos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Notes Column */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="h-5 w-5 text-brand-600" />
                                    <h3 className="font-semibold text-slate-900">Queixa Principal / Notas Técnicas</h3>
                                </div>
                                <div className="prose prose-sm prose-slate max-w-none">
                                    <p className="whitespace-pre-wrap text-slate-600">
                                        {patient.notes || "Nenhuma observação registrada."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Column */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <MapPin className="h-5 w-5 text-brand-600" />
                                    <h3 className="font-semibold text-slate-900">Endereço</h3>
                                </div>
                                <p className="text-sm text-slate-600">
                                    {fullAddress}
                                </p>
                                {address?.zip && (
                                    <p className="text-sm text-slate-500 mt-2">CEP: {address.zip}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="records" className="mt-6">
                    <RecordList patientId={patient.id} records={records} />
                </TabsContent>

                <TabsContent value="financial" className="mt-6">
                    <PatientFinancialList patientId={patient.id} invoices={invoices} />
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-slate-900">Histórico de Sessões</h3>
                        </div>
                        <SessionHistory patientId={patient.id} professionalId={patient.professional_id} />
                    </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-slate-900">Arquivos do Paciente</h3>
                        <UploadDocumentButton patientId={patient.id} professionalId={patient.professional_id} />
                    </div>
                    <DocumentList patientId={patient.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
