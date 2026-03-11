import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EventoLPR } from '../src/types.ts';
import { getMediaUrl } from '../src/config';


const AZUL_ESCURO = [30, 58, 138];  // #1e3a8a
const CINZA_BORDA = [209, 213, 219]; // #d1d5db
const LARANJA = [249, 115, 22];      // #f97316

const fetchAndCompressImage = async (url: string): Promise<string> => {
    try {
        const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } else {
                    reject(new Error('Canvas não suportado'));
                }
            };
            img.onerror = () => reject(new Error('Erro ao desenhar'));
            img.src = objectUrl;
        });
    } catch (error) {
        throw error;
    }
};

const trunc = (str: string | undefined | null, maxLen: number) => {
    if (!str) return "---";
    const cleanStr = String(str).trim();
    return cleanStr.length > maxLen ? cleanStr.substring(0, maxLen - 3) + "..." : cleanStr;
};

export const gerarPDFTicket = async (ticket: Partial<EventoLPR>) => {
    const imagensPromises = [
        fetchAndCompressImage('/sinobras-logo.png').catch(() => null),
        fetchAndCompressImage('/IanorthLog.png').catch(() => null),
        ticket.snapshot_url ? fetchAndCompressImage(getMediaUrl(ticket.snapshot_url)).catch(() => null) : Promise.resolve(null)
    ];

    let fotosExtras: string[] = [];
    if (ticket.fotos_avaria) {
        fotosExtras = ticket.fotos_avaria.split(',').map(f => f.trim()).filter(f => f !== '');
        fotosExtras.forEach(foto => {
            imagensPromises.push(fetchAndCompressImage(getMediaUrl(foto)).catch(() => null));
        });
    }

    const imagensResolvidas = await Promise.all(imagensPromises);
    
    const logoSino = imagensResolvidas[0];
    const logoIa = imagensResolvidas[1];
    const imgLpr = imagensResolvidas[2];
    const evidencias = imagensResolvidas.slice(3).filter(img => img !== null) as string[];

    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    let y = 15;

    if (logoSino) doc.addImage(logoSino, 'JPEG', 14, y - 5, 40, 15); 

    doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE IMPUREZA DE MATERIAIS (R.I.M)", width / 2, y + 2, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`TICKET Nº: ${ticket.ticket_id || '0000'}`, width - 14, y, { align: 'right' });
    doc.text(`DATA: ${ticket.timestamp_registro?.split(' ')[0] || 'N/D'}`, width - 14, y + 5, { align: 'right' });

    y += 15;
    const status = ticket.status_ticket || 'PENDENTE';
    if (status === 'Finalizado') doc.setFillColor(34, 197, 94);
    else if (status === 'Aberto') doc.setFillColor(LARANJA[0], LARANJA[1], LARANJA[2]);
    else doc.setFillColor(100, 116, 139);
    
    doc.rect(width - 44, y - 5, 30, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(status.toUpperCase(), width - 29, y - 0.5, { align: 'center' });

    y += 10;
    doc.setDrawColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
    doc.setLineWidth(0.5);
    doc.line(14, y, width - 14, y);
    y += 10;

    const drawSectionHeader = (title: string, currentY: number) => {
        doc.setFillColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
        doc.rect(14, currentY, width - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(title, 18, currentY + 5);
        return currentY + 12;
    };

    let startYSec1 = drawSectionHeader("1. DADOS DO RECEBIMENTO / FORNECEDOR", y);
    y = startYSec1;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    let leftColX = 16; let centerColX = 75;
    let rightImgW = 52; let rightImgH = 29; 
    let rightImgX = width - 14 - rightImgW; 

    doc.setFont("helvetica", "bold"); doc.text("PLACA:", leftColX, y); doc.setFont("helvetica", "normal"); doc.text(ticket.placa_veiculo || "---", leftColX + 15, y);
    doc.setFont("helvetica", "bold"); doc.text("FORNECEDOR:", centerColX, y); doc.setFont("helvetica", "normal"); doc.text(trunc(ticket.fornecedor_nome, 25), centerColX + 26, y);
    y += 6;

    doc.setFont("helvetica", "bold"); doc.text("VEÍCULO:", leftColX, y); doc.setFont("helvetica", "normal"); doc.text(trunc(ticket.tipo_veiculo, 20), leftColX + 18, y);
    doc.setFont("helvetica", "bold"); doc.text("PRODUTO:", centerColX, y); doc.setFont("helvetica", "normal"); doc.text(trunc(ticket.produto_declarado, 25), centerColX + 20, y);
    y += 6;

    doc.setFont("helvetica", "bold"); doc.text("MOTORISTA:", leftColX, y); doc.setFont("helvetica", "normal"); doc.text(trunc(ticket.motorista, 20), leftColX + 23, y);
    doc.setFont("helvetica", "bold"); doc.text("NOTA FISCAL:", centerColX, y); doc.setFont("helvetica", "normal"); doc.text(trunc(ticket.nota_fiscal, 20), centerColX + 25, y);
    y += 6;

    doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
    doc.setFont("helvetica", "bold"); doc.text("ENTRADA (Balança):", leftColX, y); doc.setFont("helvetica", "normal"); doc.text(ticket.data_entrada_sinobras || "---", leftColX + 34, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold"); doc.text("COMPOSIÇÃO (Material):", centerColX, y); 
    y += 6;

    doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
    doc.setFont("helvetica", "bold"); doc.text("REGISTRO (LPR):", leftColX, y); doc.setFont("helvetica", "normal"); doc.text(ticket.timestamp_registro || "---", leftColX + 30, y);
    doc.setTextColor(0, 0, 0);

    let materiaisY = y;
    doc.setFont("helvetica", "normal");
    if (ticket.tipo_sucata && ticket.tipo_sucata.includes('=')) {
        const itens = ticket.tipo_sucata.split(';').filter(i => i.trim() !== '');
        itens.forEach(i => {
            const [nome, resto] = i.split('=');
            const [peso] = resto ? resto.split('|') : ['0'];
            doc.text(`• ${trunc(nome, 20)}: ${Number(peso).toLocaleString('pt-BR')} kg`, centerColX, materiaisY);
            materiaisY += 5;
        });
    } else {
        doc.text(`• ${trunc(ticket.tipo_sucata || "Pendente", 30)}`, centerColX, materiaisY);
        materiaisY += 5;
    }

    if (imgLpr) {
        doc.addImage(imgLpr, 'JPEG', rightImgX, startYSec1 - 3, rightImgW, rightImgH);
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.5); doc.rect(rightImgX, startYSec1 - 3, rightImgW, rightImgH);
        doc.setFillColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]); doc.rect(rightImgX, startYSec1 - 3 + rightImgH, rightImgW, 4, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont("helvetica", "bold");
        doc.text("FOTO LPR - ENTRADA", rightImgX + (rightImgW / 2), startYSec1 - 3 + rightImgH + 3, { align: 'center' });
    } else {
        doc.setDrawColor(200, 200, 200); doc.rect(rightImgX, startYSec1 - 3, rightImgW, rightImgH);
    }

    y = Math.max(y + 8, startYSec1 + rightImgH + 10, materiaisY + 4);

    y = drawSectionHeader(" AUDITORIA DE PESAGEM E DESCONTOS", y);
    const pesoBruto = Number(ticket.peso_balanca) || 0;
    const pesoTara = Number(ticket.peso_tara) || 0;
    const pesoLiquido = Math.max(0, pesoBruto - pesoTara);
    const impurezaPct = Number(ticket.impureza_porcentagem) || 0;
    const descontoKg = Number(ticket.desconto_kg) || 0;
    const pesoFinal = Math.max(0, pesoLiquido - descontoKg);

    autoTable(doc, {
        startY: y, margin: { left: 14, right: 14 }, head: [], 
        body: [
            ['Peso Bruto (Entrada na Balança)', `${pesoBruto.toLocaleString('pt-BR')} kg`],
            ['Tara Registrada (Veículo Vazio)', `${pesoTara.toLocaleString('pt-BR')} kg`],
            ['Peso Líquido Total da Carga', `${pesoLiquido.toLocaleString('pt-BR')} kg`],
            [`Desconto por Impureza (${impurezaPct.toFixed(1)}%)`, `- ${descontoKg.toLocaleString('pt-BR')} kg`],
            ['PESO FINAL APROVADO / FATURADO', `${pesoFinal.toLocaleString('pt-BR')} kg`]
        ],
        theme: 'plain', styles: { fontSize: 9, cellPadding: 2, textColor: [0,0,0] },
        columnStyles: { 0: { fontStyle: 'normal' }, 1: { fontStyle: 'bold', halign: 'right' } },
        willDrawCell: (data) => {
            if (data.row.index === 4 && data.section === 'body') {
                doc.setFont("helvetica", "bold"); doc.setDrawColor(CINZA_BORDA[0], CINZA_BORDA[1], CINZA_BORDA[2]);
                doc.setLineWidth(0.5); doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
            }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    y = drawSectionHeader(" OBSERVAÇÕES DA CLASSIFICAÇÃO", y);
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const obs = ticket.observacao || "Sem observações adicionais registradas.";
    const splitObs = doc.splitTextToSize(obs, width - 28);
    doc.text(splitObs, 16, y);
    y += (splitObs.length * 4) + 15;

    if (evidencias.length > 0) {
        if (y > height - 40) { doc.addPage(); y = 20; }
        
        y = drawSectionHeader(` REGISTRO FOTOGRÁFICO DAS EVIDÊNCIAS (${evidencias.length})`, y);
        
        let x = 14;
        const colWidth = 85; 
        const rowHeight = 48; 
        let count = 0;

        for (const imgData of evidencias) {
            if (count % 2 === 0 && count > 0) {
                y += rowHeight + 8; x = 14;
                if (y + rowHeight > height - 30) { doc.addPage(); y = 20; }
            }

            doc.addImage(imgData, 'JPEG', x, y, colWidth, rowHeight);
            doc.setDrawColor(200, 200, 200); doc.rect(x, y, colWidth, rowHeight);

            x += colWidth + 12; 
            count++;
        }
        if (count > 0) y += rowHeight + 20;
    }

    if (y > height - 40) { doc.addPage(); y = 30; }
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5);
    doc.line(25, y, 85, y); doc.line(125, y, 185, y);
    doc.setFontSize(8); doc.setTextColor(0,0,0);
    doc.text("Responsável Técnico / Classificador", 55, y + 4, { align: 'center' });
    doc.text("Motorista / Representante do Fornecedor", 155, y + 4, { align: 'center' });

    if (logoIa) doc.addImage(logoIa, 'JPEG', 14, height - 15, 30, 5); 
    
    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text("Desenvolvido por IANorth - Tecnologia Eletromecânica", width - 14, height - 11, { align: 'right' });

    doc.save(`Ticket_${ticket.ticket_id || ticket.placa_veiculo}_RIM.pdf`);
};
