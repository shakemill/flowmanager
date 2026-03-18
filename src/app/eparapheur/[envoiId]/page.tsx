'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import CardBox from '@/app/components/shared/CardBox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';

interface DocItem {
  id: string;
  estPrincipal: boolean;
  ordre: number;
  pieceJointe: { id: string; nomFichier: string; cheminStockage: string } | null;
}

interface EnvoiDetail {
  id: string;
  statut: string;
  courrier: {
    id: string;
    numero: string;
    objet: string;
    documentPrincipalPath: string | null;
    piecesJointes: { id: string; nomFichier: string; cheminStockage: string; principal: boolean }[];
  };
  envoyeur: { name: string | null; email: string };
  documents: DocItem[];
}

export default function EparapheurTraiterPage() {
  const params = useParams();
  const router = useRouter();
  const envoiId = params.envoiId as string;
  const [envoi, setEnvoi] = useState<EnvoiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerWrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const panStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const isPanningRef = useRef(false);
  panRef.current = pan;

  useEffect(() => {
    fetch(`/api/eparapheur/envois/${envoiId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setEnvoi(data);
      })
      .catch((e) => {
        toast.error(e.message);
        router.replace('/eparapheur');
      })
      .finally(() => setLoading(false));
  }, [envoiId, router]);

  const selectedDoc = envoi?.documents[selectedDocIndex] ?? null;

  useEffect(() => {
    if (!envoi || !selectedDoc) {
      setDocUrl(null);
      return;
    }
    if (selectedDoc.pieceJointe?.cheminStockage) {
      setDocUrl(`/api/files/${selectedDoc.pieceJointe.cheminStockage.replace(/\\/g, '/')}`);
    } else if (selectedDoc.estPrincipal && envoi.courrier.documentPrincipalPath) {
      setDocUrl(`/api/files/${envoi.courrier.documentPrincipalPath.replace(/\\/g, '/')}`);
    } else if (selectedDoc.estPrincipal && envoi.courrier.piecesJointes?.length) {
      const principal = envoi.courrier.piecesJointes.find((p) => p.principal);
      if (principal?.cheminStockage) {
        setDocUrl(`/api/files/${principal.cheminStockage.replace(/\\/g, '/')}`);
      } else {
        setDocUrl(null);
      }
    } else {
      setDocUrl(null);
    }
  }, [envoi, selectedDoc]);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const getCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in e) {
        const t = e.touches[0];
        return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (isPanningRef.current) return;
      if ('touches' in e && e.touches.length > 1) return;
      if (!drawingRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;
      const { x, y } = getCoords(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [getCtx, getCoords]
  );

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (isPanningRef.current) return;
      if ('touches' in e && e.touches.length > 1) return;
      const ctx = getCtx();
      if (!ctx) return;
      drawingRef.current = true;
      const { x, y } = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [getCtx, getCoords]
  );

  const endDraw = useCallback(() => {
    drawingRef.current = false;
    const ctx = getCtx();
    if (ctx) ctx.beginPath();
  }, [getCtx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const resize = () => {
      if (!containerRef.current || !canvas) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [selectedDocIndex]);

  const submitForm = useCallback(
    async (formData: FormData) => {
      try {
        const res = await fetch(`/api/eparapheur/envois/${envoiId}/traiter`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Erreur');
        const statut = formData.get('statut') as string;
        toast.success(statut === 'VALIDE' ? 'Document validé' : 'Document rejeté');
        router.replace('/eparapheur');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setSubmitting(false);
      }
    },
    [envoiId, router]
  );

  const handleTraiter = async (statut: 'VALIDE' | 'REJETE') => {
    if (!envoi || !selectedDoc) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.set('statut', statut);
    if (commentaire.trim()) formData.set('commentaire', commentaire.trim());
    formData.set('documentId', selectedDoc.id);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.toBlob(
        (blob) => {
          if (blob) formData.set('annotationImage', blob, 'annotation.png');
          submitForm(formData);
        },
        'image/png',
        0.95
      );
    } else {
      await submitForm(formData);
    }
  };

  if (loading || !envoi) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  const labelDoc = (d: DocItem) =>
    d.estPrincipal ? `Document principal${d.pieceJointe ? ` — ${d.pieceJointe.nomFichier}` : ''}` : d.pieceJointe?.nomFichier ?? 'Document';

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <Link href="/eparapheur" className="text-sm text-primary hover:underline mb-1 inline-block">
            ← Retour aux envois
          </Link>
          <h1 className="text-xl font-bold text-foreground">
            {envoi.courrier.numero} — {envoi.courrier.objet}
          </h1>
          <p className="text-xs text-muted-foreground">
            Envoyé par {envoi.envoyeur.name || envoi.envoyeur.email}
          </p>
        </div>
      </header>

      {envoi.documents.length > 1 && (
        <div className="mb-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {envoi.documents.map((d, i) => (
              <Button
                key={d.id}
                variant={selectedDocIndex === i ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDocIndex(i)}
              >
                {labelDoc(d)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <CardBox className="flex-1 flex flex-col min-h-[50vh] p-0 overflow-hidden">
        <div
          ref={viewerWrapRef}
          className="relative flex-1 min-h-[400px] bg-muted/20 overflow-auto touch-pan-y"
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setZoom((z) => Math.min(3, Math.max(0.4, z - e.deltaY * 0.002)));
            }
          }}
          style={{ overflow: 'auto', WebkitOverflowScrolling: 'touch' }}
        >
          <div
            ref={containerRef}
            className="relative bg-muted/20"
            style={{
              width: `${100 * zoom}%`,
              minHeight: `${70 * zoom}vh`,
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
            onMouseDown={(e) => {
              if (e.button === 1 || e.button === 2) {
                e.preventDefault();
                isPanningRef.current = true;
                panStartRef.current = { x: pan.x, y: pan.y, startX: e.clientX, startY: e.clientY };
              }
            }}
            onMouseMove={(e) => {
              if (!isPanningRef.current || !panStartRef.current) return;
              setPan({
                x: panStartRef.current.x + e.clientX - panStartRef.current.startX,
                y: panStartRef.current.y + e.clientY - panStartRef.current.startY,
              });
            }}
            onMouseUp={() => {
              isPanningRef.current = false;
              panStartRef.current = null;
            }}
            onMouseLeave={() => {
              isPanningRef.current = false;
              panStartRef.current = null;
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {docUrl ? (
              <>
                <iframe
                  src={`${docUrl}#toolbar=0`}
                  title="Document"
                  className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                  style={{ minHeight: '70vh' }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                  style={{ minHeight: '70vh' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={(e) => {
                    if (e.touches.length === 2) {
                      isPanningRef.current = true;
                      panStartRef.current = {
                        x: panRef.current.x,
                        y: panRef.current.y,
                        startX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                        startY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                      };
                    } else {
                      startDraw(e);
                    }
                  }}
                  onTouchMove={(e) => {
                    if (e.touches.length === 2 && panStartRef.current) {
                      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                      const newX = panStartRef.current.x + cx - panStartRef.current.startX;
                      const newY = panStartRef.current.y + cy - panStartRef.current.startY;
                      setPan({ x: newX, y: newY });
                      panStartRef.current = { x: newX, y: newY, startX: cx, startY: cy };
                    } else {
                      draw(e);
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (e.touches.length < 2) {
                      isPanningRef.current = false;
                      panStartRef.current = null;
                      endDraw();
                    }
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground min-h-[70vh]">
                <p>Aperçu non disponible pour ce document.</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 border-t bg-muted/30">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
          >
            −
          </Button>
          <span className="text-xs tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          >
            +
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            Réinitialiser
          </Button>
        </div>
      </CardBox>

      <div className="mt-4 space-y-4">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commentaire (optionnel)</Label>
          <Textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ex. pour rejet : motif à corriger…"
            className="mt-2 min-h-[80px]"
            rows={3}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => handleTraiter('REJETE')}
            disabled={submitting}
          >
            <Icon icon="solar:close-circle-linear" className="size-5" />
            Rejeter
          </Button>
          <Button className="gap-2" onClick={() => handleTraiter('VALIDE')} disabled={submitting}>
            <Icon icon="solar:check-circle-linear" className="size-5" />
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
