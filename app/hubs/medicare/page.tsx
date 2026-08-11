import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SpecialtyTopicPage } from '@/components/specialty-topic-page';
import {
  getSouthFloridaAgents,
  getSpecialtyTopic,
} from '@/lib/hubs/specialty-topics';
import { SITE_URL } from '@/lib/constants';

const topic = getSpecialtyTopic('medicare');
if (!topic) throw new Error('medicare topic missing');

const hasListings = topic.filterAgents(getSouthFloridaAgents()).length > 0;

export const metadata: Metadata = {
  title: topic.metaTitle,
  description: topic.metaDescription,
  alternates: { canonical: `${SITE_URL}${topic.path}` },
  robots: hasListings ? { index: true, follow: true } : { index: false, follow: true },
};

export default function MedicareTopicPage() {
  const t = getSpecialtyTopic('medicare');
  if (!t) notFound();
  return <SpecialtyTopicPage topic={t} />;
}
