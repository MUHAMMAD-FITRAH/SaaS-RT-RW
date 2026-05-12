"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Star,
  Phone,
  MapPin,
  Package,
  Store,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsahaWargaSnippet {
  id: string;
  namaUsaha: string;
  pemilik: string;
  jenis: string;
  nomorHP: string | null;
  alamat: string | null;
  foto: string | null;
  tenantId: string;
  tenant: { name: string; rtNumber: string; rwNumber: string; kota: string | null };
}

interface MarketplaceProduct {
  id: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
  foto: string | null;
  kategori: string | null;
  stok: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  usahaWarga: UsahaWargaSnippet;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function waLink(hp: string | null, productName: string, usahaName: string) {
  if (!hp) return null;
  const clean = hp.replace(/\D/g, "").replace(/^0/, "62");
  const msg   = encodeURIComponent(`Halo, saya tertarik dengan produk *${productName}* dari *${usahaName}*. Apakah masih tersedia?`);
  return `https://wa.me/${clean}?text=${msg}`;
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: MarketplaceProduct }) {
  const wa = waLink(product.usahaWarga.nomorHP, product.nama, product.usahaWarga.namaUsaha);
  const { tenant } = product.usahaWarga;

  return (
    <Card
      className={`group hover:shadow-lg transition-all duration-200 overflow-hidden ${
        product.isFeatured ? "ring-2 ring-yellow-400 shadow-yellow-100" : ""
      }`}
    >
      {/* Cover photo */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {product.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.foto}
            alt={product.nama}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Featured badge */}
        {product.isFeatured && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow">
            <Star className="h-3 w-3 fill-yellow-900" />
            Unggulan
          </div>
        )}

        {/* Kategori badge */}
        {product.kategori && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full shadow">
            {product.kategori}
          </div>
        )}

        {/* Stok habis overlay */}
        {product.stok !== null && product.stok === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-red-600 px-3 py-1 rounded-full">Stok Habis</span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Product name & price */}
        <div>
          <h3 className="font-semibold text-base line-clamp-1">{product.nama}</h3>
          <p className="text-primary font-bold text-lg">{formatRupiah(product.harga)}</p>
        </div>

        {/* Description */}
        {product.deskripsi && (
          <p className="text-sm text-muted-foreground line-clamp-2">{product.deskripsi}</p>
        )}

        {/* Business info */}
        <div className="border-t pt-3 space-y-1">
          <div className="flex items-center gap-2">
            <Store className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium line-clamp-1">{product.usahaWarga.namaUsaha}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs line-clamp-1">
              RT {tenant.rtNumber} / RW {tenant.rwNumber}
              {tenant.kota ? ` · ${tenant.kota}` : ""}
            </span>
          </div>
        </div>

        {/* WA button */}
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="block">
            <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
              <Phone className="h-4 w-4" />
              Hubungi via WhatsApp
            </Button>
          </a>
        ) : (
          <Button size="sm" className="w-full" variant="outline" disabled>
            Nomor tidak tersedia
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const KATEGORI_LIST = ["Makanan", "Minuman", "Fashion", "Elektronik", "Jasa", "Kesehatan", "Lainnya"];

export default function MarketplacePage() {
  const [products, setProducts]   = useState<MarketplaceProduct[]>([]);
  const [meta, setMeta]           = useState<Meta | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [kategori, setKategori]   = useState("");
  const [page, setPage]           = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (searchVal: string, kategoriVal: string, pageVal: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageVal), limit: "12" });
      if (searchVal)  params.set("search",   searchVal);
      if (kategoriVal) params.set("kategori", kategoriVal);

      const res  = await fetch(`/api/v1/marketplace?${params}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
        setMeta(json.meta);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchData(search, kategori, 1);
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, kategori, fetchData]);

  useEffect(() => {
    fetchData(search, kategori, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const featuredCount = products.filter((p) => p.isFeatured).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          Marketplace Warga
        </h1>
        <p className="text-muted-foreground">
          Temukan produk & jasa dari UMKM warga se-kawasan
        </p>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk, toko, atau pemilik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilter(!showFilter)}
          className="gap-2 shrink-0"
        >
          <Filter className="h-4 w-4" />
          Filter
          {kategori && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">1</Badge>}
        </Button>
      </div>

      {/* Category filter chips */}
      {showFilter && (
        <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border">
          <span className="text-sm font-medium text-muted-foreground self-center mr-1">Kategori:</span>
          <button
            onClick={() => setKategori("")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !kategori ? "bg-primary text-white" : "bg-white border hover:bg-gray-50"
            }`}
          >
            Semua
          </button>
          {KATEGORI_LIST.map((k) => (
            <button
              key={k}
              onClick={() => setKategori(kategori === k ? "" : k)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                kategori === k ? "bg-primary text-white" : "bg-white border hover:bg-gray-50"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {/* Stats strip */}
      {meta && !loading && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{meta.total}</strong> produk ditemukan</span>
          {featuredCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <strong className="text-foreground">{featuredCount}</strong> unggulan
            </span>
          )}
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 mx-auto text-gray-200 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Produk tidak ditemukan</p>
          <p className="text-sm text-muted-foreground mt-1">
            Coba kata kunci lain atau hapus filter
          </p>
          {(search || kategori) && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => { setSearch(""); setKategori(""); }}
            >
              Reset Pencarian
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Featured products first */}
          {[...products].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
