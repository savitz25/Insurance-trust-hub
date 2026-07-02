import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SpecialtyTopicPage } from '@/components/specialty-topic-page';
import { getSpecialtyTopic } from '@/lib/hubs/specialty-topics';
import { SITE_URL } from '@/lib/constants';

const topic = getSpecialtyTopic('aca');
if (!topic) throw new Error('aca topic missing');

export const metadata: Metadata = {
  title: topic.metaTitle,
  description: topic.metaDescription,
  alternates: { canonical: `${SITE_URL}${topic.path}` },
};

export default function AcaTopicPage() {
  const t = getSpecialtyTopic('aca');
  if (!t) notFound();
  return <SpecialtyTopicPage topic={t} />;
}