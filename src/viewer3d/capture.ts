/** Ponte para exportar a imagem da vista 3D: a cena registra aqui como tirar uma "foto" da câmera atual. */
let capturer: ((pixelRatio: number) => Promise<Blob>) | null = null

export function setCapturer(fn: typeof capturer): void {
  capturer = fn
}

export const canCapture3D = (): boolean => capturer !== null

export function capture3D(pixelRatio: number): Promise<Blob> {
  if (!capturer) return Promise.reject(new Error('Abra a vista 3D para exportar a imagem dela.'))
  return capturer(pixelRatio)
}
