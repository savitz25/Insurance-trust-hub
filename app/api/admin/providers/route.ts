import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin/auth';
import { adminProviderSchema } from '@/lib/validations/admin';
import {
  createProvider,
  deleteProvider,
  updateProvider,
} from '@/lib/admin/mutations';
import { getAdminProviderById } from '@/lib/admin/queries';
import { schemaToFormData } from '@/lib/admin/provider-mapper';

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  const provider = await getAdminProviderById(id);
  if (!provider) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ provider });
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = adminProviderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await createProvider(schemaToFormData(parsed.data));
    return NextResponse.json({ provider: row }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Create failed' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const id = body.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const parsed = adminProviderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await updateProvider(id, schemaToFormData(parsed.data));
    return NextResponse.json({ provider: row });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  try {
    await deleteProvider(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    );
  }
}