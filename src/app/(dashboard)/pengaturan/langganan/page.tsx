"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Shield } from "lucide-react";
import { TIER_PRICES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { getTierLabel } from "@/lib/features";
import { SubscriptionTier } from "@prisma/client";

export default function LanggananPage() {
  const { data: session } = useSession();
  const currentTier = (session?.user?.tier as SubscriptionTier) ?? "TIER_A";

  const plans = [
    {
      tier: "TIER_A" as const,
      name: "Basic",
      icon: Shield,
      color: "text-blue-600",
      featureCount: 49,
      features: [
        "Pendataan warga, rumah, keluarga",
        "Tamu & kendaraan",
        "Surat keterangan & digital signature",
        "Keuangan & iuran bulanan",
        "Laporan cashflow",
        "Siskamling & ronda",
        "Berita online",
        "Saran & keluhan",
        "Agenda & foto galeri",
        "16 laporan informasi",
      ],
      excluded: ["Usaha/Lapak Warga", "Usulan Pembangunan", "Pos Security", "APK Ronda"],
    },
    {
      tier: "TIER_B" as const,
      name: "Standard",
      icon: Zap,
      color: "text-purple-600",
      featureCount: 52,
      features: [
        "Semua fitur Basic",
        "Usaha/Lapak Warga",
        "Usulan Rencana Pembangunan",
        "APK Ronda (Android)",
      ],
      excluded: ["Pos Security"],
    },
    {
      tier: "TIER_C" as const,
      name: "Premium",
      icon: Crown,
      color: "text-amber-600",
      featureCount: 53,
      features: [
        "Semua fitur Standard",
        "Pos Security",
        "Usaha Warga + Katalog Produk",
        "Prioritas support",
      ],
      excluded: [],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Langganan</h1>
        <p className="text-muted-foreground">
          Paket saat ini:{" "}
          <span className="font-semibold text-primary">
            {getTierLabel(currentTier)}
          </span>
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isUpgrade =
            plan.tier === "TIER_C" ||
            (plan.tier === "TIER_B" && currentTier === "TIER_A");

          return (
            <Card
              key={plan.tier}
              className={isCurrent ? "border-primary shadow-md" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <plan.icon className={`h-8 w-8 ${plan.color}`} />
                  {isCurrent && <Badge>Paket Saat Ini</Badge>}
                </div>
                <CardTitle className="mt-4">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {formatCurrency(TIER_PRICES[plan.tier].monthly)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /bulan
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.featureCount} fitur
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.excluded.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">
                      Tidak termasuk:
                    </p>
                    {plan.excluded.map((f) => (
                      <p key={f} className="text-xs text-muted-foreground line-through">
                        {f}
                      </p>
                    ))}
                  </div>
                )}

                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Paket Aktif
                  </Button>
                ) : isUpgrade ? (
                  <Button className="w-full">Upgrade ke {plan.name}</Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Downgrade
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
