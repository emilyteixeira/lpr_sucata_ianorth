import * as XLSX from 'xlsx';
import type { EventoLPR } from '../types';

export const exportarParaExcel = (eventos: EventoLPR[]) => {
    const dadosFormatados = eventos.map(evento => {
        
        let materiaisLimpos = evento.tipo_sucata || 'Pendente';
        if (materiaisLimpos.includes('=')) {
            materiaisLimpos = materiaisLimpos
                .split(';')
                .filter(i => i.trim() !== '')
                .map(i => i.split('=')[0].trim()) // Pega só o nome
                .join(', ');
        }

        const bruto = Number(evento.peso_balanca) || 0;
        const tara = Number(evento.peso_tara) || 0;
        const liquido = Math.max(0, bruto - tara);
        const impurezaPct = Number(evento.impureza_porcentagem) || 0;
        const descontoKg = Number(evento.desconto_kg) || 0;
        const pesoFinal = Math.max(0, liquido - descontoKg);

        return {
            'Ticket': evento.ticket_id || 'N/D',
            'Data/Hora LPR': evento.timestamp_registro,
            'Status': evento.status_ticket || 'Aberto',
            'Placa': evento.placa_veiculo,
            'Fornecedor': evento.fornecedor_nome || 'Não Identificado',
            'Produto (NF)': evento.produto_declarado || '-',
            'Materiais Classificados': materiaisLimpos,
            'Peso Bruto (kg)': bruto,
            'Tara (kg)': tara,
            'Peso Líquido (kg)': liquido,
            '% Impureza': impurezaPct.toFixed(2),
            'Desconto (kg)': descontoKg,
            'Peso Final Pago (kg)': pesoFinal,
            'Nota Fiscal': evento.nota_fiscal || '-',
            'Motorista': evento.motorista || '-',
            'Observações': evento.observacao || ''
        };
    });

    // Criar a planilha 
    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico LPR");

    // Ajusta a largura das colunas 
    const wscols = [
        { wch: 10 }, // Ticket
        { wch: 20 }, // Data/Hora
        { wch: 15 }, // Status
        { wch: 12 }, // Placa
        { wch: 35 }, // Fornecedor
        { wch: 25 }, // Produto NF
        { wch: 35 }, // Materiais
        { wch: 15 }, // Bruto
        { wch: 15 }, // Tara
        { wch: 15 }, // Liquido
        { wch: 12 }, // % Imp
        { wch: 15 }, // Desconto
        { wch: 20 }, // Peso Final
        { wch: 15 }, // NF
        { wch: 20 }, // Motorista
        { wch: 50 }  // Obs
    ];
    worksheet['!cols'] = wscols;

    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Relatorio_IANorth_${dataAtual}.xlsx`);
};
