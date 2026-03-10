import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EventoLPR } from '../src/types.ts';

const AZUL_ESCURO = [30, 58, 138];  // #1e3a8a
const CINZA_BORDA = [209, 213, 219]; // #d1d5db
const LARANJA = [249, 115, 22];      // #f97316

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`));
        img.src = url;
    });
};

export const gerarPDFTicket = async (ticket: Partial<EventoLPR>) => {
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    let y = 15;

    try {
        const logoSino = await loadImage('/sinobras-logo.png'); 
        doc.addImage(logoSino, 'PNG', 14, y - 5, 40, 15); 
    } catch (e) {
        console.warn("Logo Sinobras não encontrada em /sinobras-logo.png");
    }

    doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE IMPUREZA E PESAGEM", width / 2, y + 2, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`TICKET Nº: ${ticket.ticket_id || '0000'}`, width - 14, y, { align: 'right' });
    doc.text(`DATA: ${ticket.timestamp_registro?.split(' ')[0] || 'N/D'}`, width - 14, y + 5, { align: 'right' });

    y += 15;
    const status = ticket.status_ticket || 'PENDENTE';
    if (status === 'Finalizado') doc.setFillColor(34, 197, 94); // Verde
    else if (status === 'Aberto') doc.setFillColor(LARANJA[0], LARANJA[1], LARANJA[2]);
    else doc.setFillColor(100, 116, 139); // Cinza
    
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

    y = drawSectionHeader("1. DADOS DO RECEBIMENTO / FORNECEDOR", y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    doc.setFont("helvetica", "bold"); doc.text("PLACA:", 16, y); 
    doc.setFont("helvetica", "normal"); doc.text(ticket.placa_veiculo || "---", 35, y);
    doc.setFont("helvetica", "bold"); doc.text("FORNECEDOR:", 100, y); 
    doc.setFont("helvetica", "normal"); doc.text((ticket.fornecedor_nome || "---").substring(0, 45), 125, y);
    y += 6;

    doc.setFont("helvetica", "bold"); doc.text("VEÍCULO:", 16, y); 
    doc.setFont("helvetica", "normal"); doc.text(ticket.tipo_veiculo || "---", 35, y);
    doc.setFont("helvetica", "bold"); doc.text("PRODUTO:", 100, y); 
    doc.setFont("helvetica", "normal"); doc.text((ticket.produto_declarado || "---").substring(0, 45), 125, y);
    y += 6;

    doc.setFont("helvetica", "bold"); doc.text("MOTORISTA:", 16, y); 
    doc.setFont("helvetica", "normal"); doc.text((ticket.motorista || "---").substring(0, 30), 40, y);
    doc.setFont("helvetica", "bold"); doc.text("NOTA FISCAL:", 100, y); 
    doc.setFont("helvetica", "normal"); doc.text(ticket.nota_fiscal || "---", 125, y);
    y += 6;

    doc.setFont("helvetica", "bold"); doc.text("MATERIAL CLASSIFICADO:", 16, y); 
    doc.setFont("helvetica", "normal"); doc.text(ticket.tipo_sucata || "Pendente", 62, y);
    
    y += 12;

    y = drawSectionHeader("2. AUDITORIA DE PESAGEM E DESCONTOS", y);
    
    const pesoBruto = Number(ticket.peso_balanca) || 0;
    const pesoTara = Number(ticket.peso_tara) || 0;
    const pesoLiquido = Math.max(0, pesoBruto - pesoTara);
    const impurezaPct = Number(ticket.impureza_porcentagem) || 0;
    const descontoKg = Number(ticket.desconto_kg) || 0;
    const pesoFinal = Math.max(0, pesoLiquido - descontoKg);

    autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [], 
        body: [
            ['Peso Bruto (Entrada na Balança)', `${pesoBruto.toLocaleString('pt-BR')} kg`],
            ['Tara Registrada (Veículo Vazio)', `${pesoTara.toLocaleString('pt-BR')} kg`],
            ['Peso Líquido Total da Carga', `${pesoLiquido.toLocaleString('pt-BR')} kg`],
            [`Desconto por Impureza (${impurezaPct}%)`, `- ${descontoKg.toLocaleString('pt-BR')} kg`],
            ['PESO FINAL APROVADO / FATURADO', `${pesoFinal.toLocaleString('pt-BR')} kg`]
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2, textColor: [0,0,0] },
        columnStyles: { 
            0: { fontStyle: 'normal' },
            1: { fontStyle: 'bold', halign: 'right' }
        },
        willDrawCell: (data) => {
            if (data.row.index === 4 && data.section === 'body') {
                doc.setFont("helvetica", "bold");
                doc.setDrawColor(CINZA_BORDA[0], CINZA_BORDA[1], CINZA_BORDA[2]);
                doc.setLineWidth(0.5);
                doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
            }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    y = drawSectionHeader("3. OBSERVAÇÕES DA CLASSIFICAÇÃO", y);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    const obs = ticket.observacao || "Sem observações adicionais registradas durante a classificação da sucata.";
    const splitObs = doc.splitTextToSize(obs, width - 28);
    doc.text(splitObs, 16, y);
    y += (splitObs.length * 4) + 25;

    if (y > height - 40) {
        doc.addPage();
        y = 30;
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(25, y, 85, y);
    doc.line(125, y, 185, y);
    
    doc.setFontSize(8);
    doc.text("Responsável Técnico / Classificador", 55, y + 4, { align: 'center' });
    doc.text("Motorista / Representante do Fornecedor", 155, y + 4, { align: 'center' });

    try {
        const logoIa = await loadImage('/IanorthLog.png'); 
        doc.addImage(logoIa, 'PNG', 14, height - 15, 30, 5); // Logo pequena no rodapé
    } catch (e) {
        console.warn("Logo IANorth não encontrada em /IanorthLog.png");
    }
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Desenvolvido por IANorth - Tecnologia Eletromecânica", width - 14, height - 11, { align: 'right' });

    doc.save(`Ticket_${ticket.ticket_id || ticket.placa_veiculo}_RIM.pdf`);
};
