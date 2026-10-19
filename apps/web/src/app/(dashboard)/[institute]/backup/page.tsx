import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function BackupPage({ params }: PageProps) {
  const { institute } = await params;
  redirect(`/${institute}/admin/database`);
}

