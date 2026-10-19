import type { Metadata } from "next";
import FollowListPage from "../FollowListPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Following · FLEX" };

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  return <FollowListPage rawUsername={(await params).username} which="following" />;
}
