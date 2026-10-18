import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ institute: string }>;
};

export default async function ClassesPage({ params }: PageProps) {
  const { institute } = await params;
  redirect(`/${institute}/courses`);
}

