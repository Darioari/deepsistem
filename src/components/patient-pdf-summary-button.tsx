'use client';

import { FileDown } from 'lucide-react';
import { useState } from 'react';
import { DESIGN_TOKENS } from '@/lib/design-system';

type Patient = { id: string; nome: string };
type PdfField = { label: string; value: string };

const blocked = /(^id$|_id$|token|cpf|documento|email|telefone|celular|whatsapp|endereco|cep|rua|bairro|cidade|numero|complemento|pais|nascimento|responsavel|emergencia|iniciais)/i;
const emptyValues = new Set(['', '—', 'Não informado', 'Nao informado', 'null', 'undefined']);

function fieldLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function collectFields(value: unknown, key = '', result: PdfField[] = []): PdfField[] {
  if (blocked.test(key) || value === null || value === undefined) return result;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectFields(item, `${key} ${index + 1}`, result));
    return result;
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => collectFields(childValue, childKey, result));
    return result;
  }
  const text = String(value).trim();
  if (!emptyValues.has(text)) result.push({ label: fieldLabel(key), value: text });
  return result;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [Number.parseInt(clean.slice(0, 2), 16), Number.parseInt(clean.slice(2, 4), 16), Number.parseInt(clean.slice(4, 6), 16)];
}

async function rasterizeLogo(url: string): Promise<string | null> {
  if (!url) return null;
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const scale = Math.min(1, 600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, image.naturalWidth * scale);
      canvas.height = Math.max(1, image.naturalHeight * scale);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      try { resolve(canvas.toDataURL('image/png')); } catch { resolve(null); }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function PatientPdfSummaryButton({ patient, label = 'Resumo do paciente' }: { patient: Patient; label?: string }) {
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const [{ jsPDF }, brandResponse] = await Promise.all([import('jspdf'), fetch('/api/brand/settings')]);
      const brand = brandResponse.ok ? await brandResponse.json() : {};
      const primary = /^#[0-9a-f]{6}$/i.test(brand.cor_primaria || '') ? brand.cor_primaria : DESIGN_TOKENS.color.primary;
      const secondary = /^#[0-9a-f]{6}$/i.test(brand.cor_secundaria || '') ? brand.cor_secundaria : DESIGN_TOKENS.color.secondary;
      const logoUrl = typeof brand.logotipo_url === 'string' && /^(https?:\/\/|\/)/.test(brand.logotipo_url) && !brand.logotipo_url.includes('platform-logo') ? brand.logotipo_url : '';
      let logoData = await rasterizeLogo(logoUrl);
      if (!logoData) {
        logoData = (await rasterizeLogo('/brand/deepsistem-logo.webp')) || (await rasterizeLogo('/brand/deepsistem-logo.png'));
      }
      const endpoints = [
        ['Central clínica', `/api/pacientes/${patient.id}/central`],
        ['Estudo de caso', `/api/pacientes/${patient.id}/estudo-caso`],
        ['Reabilitação neuropsicológica', `/api/pacientes/${patient.id}/reabilitacao`],
        ['Avaliação neuropsicológica', `/api/neuroavaliacoes?patientId=${patient.id}`],
        ['Sessões e acompanhamento', '/api/sessoes'],
      ] as const;
      const sections = await Promise.all(endpoints.map(async ([title, url]) => {
        const response = await fetch(url);
        const data = response.ok ? await response.json() : null;
        const scoped = title === 'Sessões e acompanhamento' && Array.isArray(data)
          ? data.filter(item => item.patientId === patient.id).map(({ patientId, patientName, ...item }) => item)
          : data;
        return { title, fields: collectFields(scoped) };
      }));

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const [pr, pg, pb] = hexToRgb(primary);
      const [sr, sg, sb] = hexToRgb(secondary);
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 17;
      const contentWidth = pageWidth - margin * 2;
      let y = 0;

      const addPageHeader = () => {
        pdf.setFillColor(249, 248, 252); pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        pdf.setDrawColor(pr, pg, pb); pdf.setLineWidth(.6); pdf.line(margin, 14, pageWidth - margin, 14);
        if (logoData) pdf.addImage(logoData, 'PNG', margin, 18, 34, 12, undefined, 'FAST');
        else {
          pdf.setTextColor(pr, pg, pb); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.text('DeePsistem', margin, 26);
        }
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(105, 101, 116);
        pdf.text('RESUMO DO ACOMPANHAMENTO', pageWidth - margin, 25, { align: 'right' });
        y = 38;
      };
      const ensureSpace = (height: number) => {
        if (y + height <= pageHeight - 18) return;
        pdf.addPage(); addPageHeader();
      };
      const roundedBox = (x: number, top: number, width: number, height: number, fill: [number, number, number], border: [number, number, number]) => {
        pdf.setFillColor(...fill); pdf.setDrawColor(...border); pdf.setLineWidth(.3); pdf.roundedRect(x, top, width, height, 4, 4, 'FD');
      };

      addPageHeader();
      roundedBox(margin, y, contentWidth, 55, [247, 244, 255], [pr, pg, pb]);
      pdf.setTextColor(pr, pg, pb); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.text('RESUMO CLÍNICO INTEGRADO', margin + 9, y + 11);
      pdf.setTextColor(37, 32, 52); pdf.setFontSize(20);
      const title = pdf.splitTextToSize(`Resumo longitudinal do acompanhamento de ${patient.nome}`, contentWidth - 18);
      pdf.text(title, margin + 9, y + 23);
      pdf.setTextColor(101, 94, 116); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
      pdf.text('Uma visão organizada dos registros disponíveis para apoiar a continuidade do cuidado.', margin + 9, y + 45);
      y += 64;

      const populated = sections.filter(section => section.fields.length);
      const cardWidth = (contentWidth - 8) / 3;
      populated.slice(0, 3).forEach((section, index) => {
        const x = margin + index * (cardWidth + 4);
        roundedBox(x, y, cardWidth, 24, [255, 255, 255], [226, 222, 234]);
        pdf.setTextColor(pr, pg, pb); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.text(section.title.toUpperCase(), x + 5, y + 8);
        pdf.setTextColor(37, 32, 52); pdf.setFontSize(14); pdf.text(String(section.fields.length), x + 5, y + 17);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(115, 108, 126); pdf.text('registros consolidados', x + 13, y + 17);
      });
      y += 33;

      roundedBox(margin, y, contentWidth, 22, [245, 243, 252], [229, 225, 237]);
      pdf.setTextColor(sr, sg, sb); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.text('PRIVACIDADE CLÍNICA', margin + 7, y + 8);
      pdf.setTextColor(74, 69, 84); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
      pdf.text('Dados de contato, documentos pessoais, endereço e demais identificadores sensíveis foram excluídos.', margin + 7, y + 15);
      y += 31;

      for (const section of populated) {
        ensureSpace(25);
        pdf.setTextColor(sr, sg, sb); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text(section.title, margin, y);
        pdf.setDrawColor(pr, pg, pb); pdf.setLineWidth(.5); pdf.line(margin, y + 4, margin + 32, y + 4);
        y += 11;
        for (const field of section.fields) {
          const lines = pdf.splitTextToSize(field.value, contentWidth - 12);
          const height = Math.max(18, 12 + lines.length * 4.3);
          ensureSpace(height + 4);
          roundedBox(margin, y, contentWidth, height, [255, 255, 255], [231, 228, 236]);
          pdf.setTextColor(pr, pg, pb); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.text(field.label.toUpperCase(), margin + 6, y + 7);
          pdf.setTextColor(49, 46, 57); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.text(lines, margin + 6, y + 13);
          y += height + 4;
        }
        y += 5;
      }

      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page); pdf.setDrawColor(225, 222, 230); pdf.line(margin, 282, pageWidth - margin, 282);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(120, 116, 128);
        pdf.text('Documento confidencial. Revise e valide o conteúdo antes do compartilhamento clínico.', margin, 288);
        pdf.text(`${page} / ${pages}`, pageWidth - margin, 288, { align: 'right' });
      }

      const date = new Date().toLocaleDateString('pt-BR').replaceAll('/', '-');
      const safeName = patient.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
      pdf.save(`Resumo_do_acompanhamento_${safeName}_${date}.pdf`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível gerar o resumo.');
    } finally {
      setLoading(false);
    }
  }

  return <button className="btn-action patient-pdf-button" onClick={generate} disabled={loading}><FileDown className="w-4 h-4" /> {loading ? 'Preparando...' : label}</button>;
}
