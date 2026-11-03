export function bannerCrop(width: number, height: number, zoom: number, x: number, y: number) {
  const cropWidth = Math.min(width, height * 4) / Math.max(1, zoom);
  const cropHeight = cropWidth / 4;
  return { x: (width - cropWidth) * Math.max(0, Math.min(1, x)), y: (height - cropHeight) * Math.max(0, Math.min(1, y)), width: cropWidth, height: cropHeight };
}

export function moveBannerCrop(width: number, height: number, zoom: number, x: number, y: number, dx: number, dy: number, previewWidth: number) {
  const crop = bannerCrop(width, height, zoom, x, y);
  const scale = previewWidth / crop.width;
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return {
    x: width > crop.width ? clamp(x - dx / (scale * (width - crop.width))) : x,
    y: height > crop.height ? clamp(y - dy / (scale * (height - crop.height))) : y,
  };
}
