"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

const TERMS_TEXT = `Termos de Uso

Ao utilizar este aplicativo, você concorda com os presentes Termos de Uso.

1. Finalidade do aplicativo

Este aplicativo tem finalidade exclusivamente educacional, sendo destinado ao apoio aos estudos por meio de organização de conteúdos, análise de desempenho e recursos específicos de inteligência artificial aplicados ao contexto de aprendizagem.

2. Dados coletados

Para funcionamento da conta, o aplicativo poderá solicitar apenas os seguintes dados:

Nome e e-mail

O aplicativo não solicita nem acessa dados pessoais do aparelho do usuário, como fotos, contatos, mensagens, localização, microfone, câmera, arquivos privados ou quaisquer outras informações do dispositivo, salvo os arquivos que o próprio usuário decidir enviar voluntariamente dentro da plataforma.

3. Uso dos dados

Os dados informados pelo usuário não serão utilizados para fins de divulgação, propaganda, venda, compartilhamento comercial ou marketing de terceiros.

Esses dados poderão ser utilizados apenas para:

Identificação e autenticação da conta do usuário
Funcionamento regular da plataforma
Melhoria da experiência e dos recursos do próprio aplicativo
Aperfeiçoamento interno do serviço

4. Conteúdos gerados no aplicativo

As informações, análises, registros e materiais de estudo produzidos dentro do aplicativo têm finalidade exclusivamente educacional e de uso pessoal do usuário dentro da plataforma.

5. Upload de arquivos

O usuário poderá enviar arquivos, incluindo PDFs de provas, simulados e materiais próprios de estudo, exclusivamente para uso dentro das funcionalidades do aplicativo.

O envio desses arquivos é feito por iniciativa do próprio usuário. O aplicativo não possui banco próprio de questões e não se destina à disponibilização de acervo próprio de provas ou perguntas.

6. Uso de inteligência artificial

O aplicativo poderá utilizar recursos de inteligência artificial apenas em campos e funcionalidades específicas, especialmente para análise de questões e apoio ao estudo.

A inteligência artificial será empregada como ferramenta de suporte educacional e não substitui orientação acadêmica, profissional ou técnica especializada.

7. Privacidade e segurança

O aplicativo adota medidas razoáveis para proteger as informações inseridas pelo usuário dentro da plataforma, buscando limitar o uso dos dados às finalidades descritas nestes Termos.

8. Limitação de responsabilidade

O aplicativo é uma ferramenta de apoio ao estudo. O usuário permanece responsável pela forma como utiliza os conteúdos, análises e sugestões fornecidos pela plataforma.

9. Atualizações destes Termos

Estes Termos de Uso poderão ser atualizados periodicamente para refletir melhorias, ajustes operacionais ou alterações nas funcionalidades do aplicativo.

10. Aceite

Ao criar conta ou utilizar o aplicativo, o usuário declara estar ciente e de acordo com estes Termos de Uso.`;

export type TermsModalProps = {
  show: boolean;
  onClose: () => void;
};

export function TermsModal({ show, onClose }: TermsModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl bg-paper border border-edge p-4 space-y-4 shadow-overlay"
      >
        <div className="max-h-[65vh] overflow-y-auto whitespace-pre-line text-sm text-ink leading-relaxed">
          {TERMS_TEXT}
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
