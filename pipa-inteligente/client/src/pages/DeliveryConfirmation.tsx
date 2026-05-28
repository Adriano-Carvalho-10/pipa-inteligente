import { BackButton } from "@/components/BackButton";
import { useState } from "react";
import { useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Camera, Signature, FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function DeliveryConfirmation() {
  const [, params] = useRoute("/delivery/:id/confirm");
  const deliveryId = params?.id ? parseInt(params.id) : null;

  const [recipientName, setRecipientName] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmMutation = trpc.drivers.deliveries.confirm.useMutation();

  // Lê a foto selecionada e armazena como data URL
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string);
        toast.success("Foto capturada");
      };
      reader.readAsDataURL(file);
    }
  };

  // Lê a assinatura capturada e armazena como data URL
  const handleSignatureCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSignatureUrl(event.target?.result as string);
        toast.success("Assinatura capturada");
      };
      reader.readAsDataURL(file);
    }
  };

  // Envia a confirmação de entrega com foto, assinatura e nome do destinatário
  const handleSubmit = async () => {
    if (!deliveryId) {
      toast.error("ID de entrega não encontrado");
      return;
    }

    if (!recipientName.trim()) {
      toast.error("Por favor, insira o nome do destinatário");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmMutation.mutateAsync({
        deliveryId,
        recipientName,
        notes,
        photoUrl: photoUrl || undefined,
        signatureUrl: signatureUrl || undefined,
      });

      toast.success("Entrega confirmada com sucesso!");
      // Redirecionar para painel de motorista
      setTimeout(() => {
        window.location.href = "/driver";
      }, 1500);
    } catch (error) {
      toast.error("Erro ao confirmar entrega");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950/20 to-orange-950/20">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-950/80 to-orange-950/80 border-b border-teal-500/20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <BackButton />
          <div className="flex items-center gap-4 mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
            <h1 className="text-4xl font-bold text-white">Confirmar Entrega</h1>
          </div>
          <p className="text-teal-300/80 text-lg">
            Preencha os dados e confirme a entrega
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-6">
          {/* Dados do Destinatário */}
          <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Informações do Destinatário</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-teal-300 font-semibold mb-2">
                    Nome do Destinatário *
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Digite o nome completo"
                    className="w-full bg-slate-800/50 border border-teal-500/20 rounded-lg px-4 py-2 text-white placeholder-teal-300/50 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                <div>
                  <label className="block text-teal-300 font-semibold mb-2">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione qualquer observação sobre a entrega"
                    rows={3}
                    className="w-full bg-slate-800/50 border border-teal-500/20 rounded-lg px-4 py-2 text-white placeholder-teal-300/50 focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Foto de Comprovação */}
          <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Camera className="w-6 h-6 text-orange-400" />
                Foto de Comprovação
              </h2>

              <div className="border-2 border-dashed border-teal-500/30 rounded-lg p-8 text-center">
                {photoUrl ? (
                  <div className="space-y-4">
                    <img
                      src={photoUrl}
                      alt="Foto de comprovação"
                      className="max-h-64 mx-auto rounded-lg border border-teal-500/20"
                    />
                    <Button
                      onClick={() => setPhotoUrl(null)}
                      className="bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                      Remover Foto
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Camera className="w-12 h-12 text-teal-400/50 mx-auto mb-3" />
                    <p className="text-teal-300 mb-4">Tire uma foto do local da entrega</p>
                    <label className="inline-block">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        className="hidden"
                      />
                      <span className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-6 py-2 rounded-lg cursor-pointer inline-block">
                        Capturar Foto
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Assinatura */}
          <Card className="bg-gradient-to-br from-slate-900/50 to-slate-950/70 border-teal-500/20">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Signature className="w-6 h-6 text-orange-400" />
                Assinatura do Destinatário
              </h2>

              <div className="border-2 border-dashed border-teal-500/30 rounded-lg p-8 text-center">
                {signatureUrl ? (
                  <div className="space-y-4">
                    <img
                      src={signatureUrl}
                      alt="Assinatura"
                      className="max-h-32 mx-auto rounded-lg border border-teal-500/20"
                    />
                    <Button
                      onClick={() => setSignatureUrl(null)}
                      className="bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                      Remover Assinatura
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Signature className="w-12 h-12 text-teal-400/50 mx-auto mb-3" />
                    <p className="text-teal-300 mb-4">Capture a assinatura do destinatário</p>
                    <label className="inline-block">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleSignatureCapture}
                        className="hidden"
                      />
                      <span className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-6 py-2 rounded-lg cursor-pointer inline-block">
                        Capturar Assinatura
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Ações */}
          <div className="flex gap-4">
            <Button
              asChild
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-0"
            >
              <Link href="/driver">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !recipientName.trim()}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isSubmitting ? "Confirmando..." : "Confirmar Entrega"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
