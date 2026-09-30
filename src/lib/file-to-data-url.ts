// File extends Blob, así que esto también sirve para convertir los blobs
// reales de las infografías generadas (no solo archivos subidos por el
// usuario) antes de mandarlos a un server action.
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
