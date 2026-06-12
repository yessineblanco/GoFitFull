import Image, { type ImageLoader, type ImageProps } from "next/image";

export const externalImageLoader: ImageLoader = ({ src }) => src;

export function ExternalImage({ alt, ...props }: ImageProps) {
  return (
    <Image
      {...props}
      alt={alt}
      loader={externalImageLoader}
      unoptimized
    />
  );
}
