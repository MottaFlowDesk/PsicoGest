export type CropArea = {
    x: number;
    y: number;
    width: number;
    height: number;
};

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.setAttribute("crossOrigin", "anonymous");
        image.src = url;
    });
}

export async function getCroppedImageBlob(
    imageSrc: string,
    pixelCrop: CropArea,
    outputSize = 400
): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error("Não foi possível processar a imagem");
    }

    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputSize,
        outputSize
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error("Falha ao gerar imagem recortada"));
                    return;
                }
                resolve(blob);
            },
            "image/jpeg",
            0.92
        );
    });
}
