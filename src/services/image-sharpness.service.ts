
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageSharpnessService {

  async checkSharpness(file: File): Promise<number> {
    const imageBitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const grayScaleData = this.toGrayscale(imageData.data, canvas.width, canvas.height);
    const laplacian = this.laplacian(grayScaleData, canvas.width, canvas.height);
    return this.variance(laplacian);
  }

  private toGrayscale(data: Uint8ClampedArray, width: number, height: number): number[] {
    const gray: number[] = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return gray;
  }

  private laplacian(data: number[], width: number, height: number): number[] {
    const laplacianData = new Array(data.length);
    const kernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = data[(y + ky) * width + (x + kx)];
            const weight = kernel[(ky + 1) * 3 + (kx + 1)];
            sum += pixel * weight;
          }
        }
        laplacianData[i] = sum;
      }
    }
    // Filter out undefined values at edges
    return laplacianData.filter(v => v !== undefined);
  }

  private variance(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / data.length;
  }
}
