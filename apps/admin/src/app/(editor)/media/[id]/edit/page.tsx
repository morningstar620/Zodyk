import { MediaEditor } from '@/components/media/media-editor';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MediaEditPage({ params }: PageProps) {
  const { id } = await params;
  return <MediaEditor assetId={id} />;
}
