"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  ImagesSquare, FacebookLogo, InstagramLogo, ArrowSquareOut,
  Heart, ChatCircle, CaretLeft, CaretRight, WarningCircle, CircleNotch
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMetaAdAccountsAction, getMetaPromotePagesAction,
  getMetaUserPagesAction, getMetaPagePublishedPostsAction,
  getMetaPageInstagramAccountAction, getInstagramMediaAction,
} from "@/app/actions/meta-ads";
import type { MetaPromotePage, MetaPagePost, InstagramMediaItem } from "@/app/actions/meta-ads";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function PostCard({ post }: { post: MetaPagePost }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {post.full_picture && (
        <div className="relative aspect-video bg-muted overflow-hidden">
          <Image src={post.full_picture} alt="Post" fill className="object-cover" unoptimized />
        </div>
      )}
      <CardContent className="p-4">
        <p className="text-sm text-foreground line-clamp-3">{post.message || post.story || "Sin texto"}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {format(new Date(post.created_time), "dd MMM yyyy", { locale: es })}
          </span>
          {post.permalink_url && (
            <a href={post.permalink_url} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 transition-colors">
              <ArrowSquareOut size={15} />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IgCard({ item }: { item: InstagramMediaItem }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
      <div className="relative aspect-square bg-muted overflow-hidden">
        {(item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url) && (
          <Image src={(item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url)!} alt="Media" fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end p-2">
          <div className="flex gap-3 text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold">
            {item.like_count !== undefined && <span className="flex items-center gap-1"><Heart size={12} weight="fill" />{item.like_count.toLocaleString()}</span>}
            {item.comments_count !== undefined && <span className="flex items-center gap-1"><ChatCircle size={12} weight="fill" />{item.comments_count.toLocaleString()}</span>}
          </div>
        </div>
        <Badge className="absolute top-2 right-2 text-[10px]" variant="secondary">{item.media_type === "CAROUSEL_ALBUM" ? "Álbum" : item.media_type === "VIDEO" ? "Video" : "Foto"}</Badge>
      </div>
      {item.caption && (
        <div className="p-3">
          <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>
        </div>
      )}
    </Card>
  );
}

export default function MetaContenidoPage() {
  const { user } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [tab, setTab] = useState("facebook");

  const { data: adAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["adAccounts"],
    queryFn: async () => {
      const r = await getMetaAdAccountsAction();
      return Array.isArray(r) ? r : [];
    },
  });

  useEffect(() => {
    if (adAccounts.length && !selectedAccount) setSelectedAccount(adAccounts[0].id);
  }, [adAccounts]);

  const { data: pages = [], isLoading: loadingPages } = useQuery({
    queryKey: ["promotePages", selectedAccount],
    queryFn: async () => {
      if (!selectedAccount) return [];
      const r = await getMetaPromotePagesAction(selectedAccount);
      return Array.isArray(r) ? r as MetaPromotePage[] : [];
    },
    enabled: !!selectedAccount,
  });

  useEffect(() => {
    if (pages.length && !selectedPage) setSelectedPage(pages[0].id);
  }, [pages]);

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["fbPosts", selectedPage],
    queryFn: async () => {
      if (!selectedPage) return [];
      const r = await getMetaPagePublishedPostsAction(selectedPage);
      return Array.isArray(r) ? r as MetaPagePost[] : [];
    },
    enabled: !!selectedPage,
  });

  const { data: igAccount } = useQuery({
    queryKey: ["igAccount", selectedPage],
    queryFn: async () => {
      if (!selectedPage) return null;
      const r = await getMetaPageInstagramAccountAction(selectedPage);
      return "error" in r ? null : r;
    },
    enabled: !!selectedPage,
  });

  const { data: igMedia = [], isLoading: loadingIg } = useQuery({
    queryKey: ["igMedia", igAccount?.id],
    queryFn: async () => {
      if (!igAccount?.id) return [];
      const r = await getInstagramMediaAction(igAccount.id);
      return Array.isArray(r) ? r as InstagramMediaItem[] : [];
    },
    enabled: !!igAccount?.id,
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><ImagesSquare size={24} weight="duotone" /></div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Contenido</h1>
            <p className="text-muted-foreground text-sm">Posts de Facebook e Instagram</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder={loadingAccounts ? "Cargando..." : "Selecciona cuenta"} />
            </SelectTrigger>
            <SelectContent>
              {adAccounts.map((acc: any) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={loadingPages ? "Cargando..." : "Selecciona página"} />
            </SelectTrigger>
            <SelectContent>
              {pages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedAccount ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <WarningCircle size={40} />
          <p className="text-center">Selecciona una cuenta publicitaria para ver el contenido.</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="facebook" className="gap-2"><FacebookLogo size={15} />Facebook ({posts.length})</TabsTrigger>
            <TabsTrigger value="instagram" className="gap-2"><InstagramLogo size={15} />Instagram ({igMedia.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="facebook">
            {loadingPosts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                <FacebookLogo size={40} />
                <p>No se encontraron posts de Facebook.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {posts.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="instagram">
            {!igAccount ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                <InstagramLogo size={40} />
                <p>No se encontró cuenta de Instagram Business vinculada.</p>
              </div>
            ) : loadingIg ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
              </div>
            ) : igMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                <InstagramLogo size={40} />
                <p>No se encontraron publicaciones de Instagram.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {igMedia.map((item) => <IgCard key={item.id} item={item} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
