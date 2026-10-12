"use client";

import { useState } from "react";
import Celebration from "./Celebration";

type Props = {
  amountCents: number;
  newTotalCents: number;
  rank: number;
  tierChanged: boolean;
  newTierName: string;
  newTierEmoji: string;
};

/** Shows the confetti overlay once on the success page; dismissing reveals the summary card beneath. */
export default function SuccessCelebration(props: Props) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return <Celebration {...props} onClose={() => setOpen(false)} />;
}
