import React, { useEffect, useState } from 'react';
import { Calculator, Scale, Plus, Trash2, FileWarning, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { TruckVisualizer } from './TruckVisualizer';
import type { EventoLPR } from '../types';
import { gerarPDFTicket } from '../../utils/pdfGenerator';

const DENSITY_RANGES: Record<string, [number, number]> = {
    "SUCATA MISTA": [0.2, 0.6],
    "SUCATA MIÚDA": [0.5, 1.5],
    "SUCATA PESADA": [0.5, 1.6],
    "SUCATA GRAÚDA DE CORTE": [0.6, 1.7],
    "SUCATA TRILHO FERROVIÁRIO": [0.6, 1.7],
    "SUCATA SHREDDER INDUSTRIALIZADA": [0.65, 1.15],
    "SUCATA TESOURADA INDUSTRIALIZADA": [0.45, 1.1],
    "SUCATA PESADA INDUSTRIALIZADA": [0.5, 1.6],
    "SUCATA DE GUSA INDUSTRIALIZADA": [2.0, 4.0],
    "GUSA SÓLIDO INDUSTRIALIZADO": [2.7, 3.9],
    "SUCATA PACOTE ENCHARUTADO": [0.4, 1.5],
    "SUCATA PACOTE MISTO": [0.4, 1.5]
};

interface Props {
    formData: Partial<EventoLPR>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<EventoLPR>>>;
    ticket: EventoLPR | null;
    isFinalizado?: boolean; 
}

interface MaterialItem {
    tipo: string;
    peso: number;
    impureza: number;
}

export function ClassificationCalculator({ formData, setFormData, ticket, isFinalizado = false }: Props) {
    const [materiais, setMateriais] = useState<MaterialItem[]>([]);
    const [gerandoPdf, setGerandoPdf] = useState(false); // <-- Estado para o botão de PDF

    useEffect(() => {
        if (ticket?.tipo_sucata && materiais.length === 0) {
            if (ticket.tipo_sucata.includes('=')) {
                const itens = ticket.tipo_sucata.split(';').map(s => {
                    const [tipo, resto] = s.split('=');
                    const [val1, imp] = (resto || '0').includes('|') ? resto.split('|') : [resto, '0'];
                    return { tipo: tipo?.trim(), peso: Number(val1) || 0, impureza: Number(imp) || 0 };
                });
                setMateriais(itens);
            } else {
                setMateriais([{ tipo: ticket.tipo_sucata, peso: 0, impureza: 0 }]);
            }
        } else if (materiais.length === 0) {
            setMateriais([{ tipo: "", peso: 0, impureza: 0 }]);
        }
    }, [ticket]);

    useEffect(() => {
        let totalPesoInfo = 0;
        let totalImpurezaKgInfo = 0;
        materiais.forEach(m => {
            totalPesoInfo += m.peso;
            totalImpurezaKgInfo += m.impureza;
        });

        const mediaImpurezaCalculada = totalPesoInfo > 0 ? (totalImpurezaKgInfo / totalPesoInfo) * 100 : 0;
        const strTipos = materiais.map(m => `${m.tipo}=${m.peso}|${m.impureza}`).join(';');

        if (!isFinalizado) {
            setFormData(prev => {
                if (prev.tipo_sucata === strTipos && prev.impureza_porcentagem === mediaImpurezaCalculada) {
                    return prev;
                }
                return { ...prev, tipo_sucata: strTipos, impureza_porcentagem: mediaImpurezaCalculada };
            });
        }
    }, [materiais, setFormData, isFinalizado]);

    const addMaterial = () => setMateriais([...materiais, { tipo: "", peso: 0, impureza: 0 }]);
    const removeMaterial = (idx: number) => { const n = [...materiais]; n.splice(idx,1); setMateriais(n); };

    const updateMaterial = (idx: number, field: keyof MaterialItem, val: any) => {
        const n = [...materiais]; n[idx] = { ...n[idx], [field]: val };
        setMateriais(n);
    };

    // --- CÁLCULOS GLOBAIS ---
    const pesoBruto = ticket?.peso_balanca || 0;
    const pesoTara = Number(formData.peso_tara) || 0;
    const pesoLiquido = Math.max(0, pesoBruto - pesoTara);

    const comp = Number(formData.dim_comprimento) || 0;
    const larg = Number(formData.dim_largura) || 0;
    const alt = Number(formData.dim_altura) || 0;
    const vol = comp * larg * alt;

    let totalPesoInformado = 0;
    let totalImpurezaKgInformada = 0;
    materiais.forEach(m => {
        totalPesoInformado += m.peso;
        totalImpurezaKgInformada += m.impureza;
    });

    let minIdeal = 0; 
    let maxIdeal = 0;

    materiais.forEach(m => {
        const pesoRelativo = totalPesoInformado > 0 ? (m.peso / totalPesoInformado) : 0;
        const range = DENSITY_RANGES[m.tipo];
        if (range) {
            minIdeal += range[0] * pesoRelativo;
            maxIdeal += range[1] * pesoRelativo;
        }
    });

    const mediaImpurezaFinal = totalPesoInformado > 0 ? (totalImpurezaKgInformada / totalPesoInformado) * 100 : 0;
    const minFinal = minIdeal;
    const maxFinal = maxIdeal;
    const densidade = vol > 0 ? ((pesoLiquido / 1000) / vol) : 0;

    const descontoKgTotal = pesoLiquido * (mediaImpurezaFinal / 100);
    const pesoFinalTotal = pesoLiquido - descontoKgTotal;

    let statusTexto = "Aguardando dados";
    let statusCor = "text-slate-400";
    let statusBg = "bg-slate-100 dark:bg-slate-800 border-slate-200";
    let icone = <Scale size={14}/>;

    if (totalPesoInformado > 0 && vol > 0) {
        if (mediaImpurezaFinal > 3.0) {
            statusTexto = `ALERTA R.I.M. (${mediaImpurezaFinal.toFixed(1)}%)`;
            statusCor = "text-red-700 dark:text-red-100";
            statusBg = "bg-red-100 dark:bg-red-900 border-red-500";
            icone = <FileWarning size={14}/>;
        } else if (densidade < minFinal) {
            statusTexto = "ABAIXO da FAIXA";
            statusCor = "text-orange-700 dark:text-orange-200";
            statusBg = "bg-orange-100 dark:bg-orange-900/50 border-orange-300";
            icone = <AlertTriangle size={14}/>;
        } else if (densidade > maxFinal) {
            statusTexto = "ACIMA DA FAIXA";
            statusCor = "text-orange-700 dark:text-orange-200";
            statusBg = "bg-orange-100 dark:bg-orange-900/50 border-orange-300";
            icone = <AlertTriangle size={14}/>;
        } else {
            statusTexto = "NA FAIXA";
            statusCor = "text-green-700 dark:text-green-200";
            statusBg = "bg-green-100 dark:bg-green-900/50 border-green-300";
            icone = <CheckCircle size={14}/>;
        }
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-6 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold flex items-center gap-2 dark:text-white">
                    <Calculator size={20} className="text-green-600"/> Classificação & Cubagem
                </h3>
                {isFinalizado && (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded">
                        SOMENTE LEITURA
                    </span>
                )}
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LISTA DE MATERIAIS */}
                <div className="lg:col-span-7 space-y-3 border-r border-slate-200 dark:border-slate-700 pr-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase">Composição da Carga</h4>
                        {!isFinalizado && (
                            <button onClick={addMaterial} className="text-xs text-blue-600 font-bold flex gap-1 hover:underline">
                                <Plus size={12}/> Adicionar Sucata
                            </button>
                        )}
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {materiais.map((m, idx) => {
                            const proporcao = totalPesoInformado > 0 ? (m.peso / totalPesoInformado) : 0;
                            const pctVisual = proporcao * 100;
                            const impPct = m.peso > 0 ? (m.impureza / m.peso) * 100 : 0;
                            const pesoBrutoRealDoItem = pesoLiquido * proporcao;
                            const itemDesconto = pesoBrutoRealDoItem * (impPct / 100);
                            const itemLiquido = pesoBrutoRealDoItem - itemDesconto;

                            return (
                                <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                                    <div className="col-span-3">
                                        <label className="block text-[8px] text-slate-400 font-bold mb-0.5">TIPO SUCATA</label>
                                        <select className="w-full bg-white dark:bg-slate-700 border dark:border-slate-600 text-[9px] font-bold text-slate-800 dark:text-white rounded px-1 py-1 outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                                            value={m.tipo} onChange={e => updateMaterial(idx, 'tipo', e.target.value)} disabled={isFinalizado}>
                                            <option value="">Selecione...</option>
                                            {Object.keys(DENSITY_RANGES).map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2 pl-1">
                                        <label className="block text-[8px] text-slate-400 font-bold mb-0.5 text-center">PESO (kg)</label>
                                        <input type="number" className="w-full bg-white dark:bg-slate-700 border dark:border-slate-600 rounded px-1 py-1 text-center text-[10px] dark:text-white font-bold disabled:opacity-60"
                                            value={m.peso > 0 ? m.peso : ''} 
                                            onChange={e => updateMaterial(idx, 'peso', Number(e.target.value))} disabled={isFinalizado} />
                                    </div>
                                    <div className="col-span-1 flex flex-col items-center justify-center pt-3">
                                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400" title="% da Carga">{pctVisual.toFixed(0)}%</span>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[8px] text-red-400 font-bold mb-0.5 text-center">IMP (kg)</label>
                                        <input type="number" className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-1 py-1 text-center text-[10px] text-red-600 dark:text-red-300 font-bold disabled:opacity-60"
                                            value={m.impureza > 0 ? m.impureza : ''} 
                                            onChange={e => updateMaterial(idx, 'impureza', Number(e.target.value))} disabled={isFinalizado} />
                                    </div>
                                    <div className="col-span-1 flex flex-col items-center justify-center pt-3">
                                        <span className="text-[9px] font-bold text-red-500 dark:text-red-400" title="% Impureza deste material">{impPct.toFixed(1)}%</span>
                                    </div>
                                    <div className="col-span-2 flex flex-col items-end justify-center pr-1 border-l border-slate-200 dark:border-slate-700 h-full">
                                        {itemLiquido > 0 ? (
                                            <>
                                                <span className="text-[10px] font-bold text-green-700 dark:text-green-400 leading-tight">{itemLiquido.toFixed(0)} kg</span>
                                                {itemDesconto > 0 && <span className="text-[8px] font-bold text-red-500 dark:text-red-400 leading-tight">- {itemDesconto.toFixed(0)} kg</span>}
                                            </>
                                        ) : <span className="text-[8px] text-slate-400 italic">0 kg</span>}
                                    </div>
                                    <div className="col-span-1 flex justify-center pt-3">
                                        {!isFinalizado && (
                                            <button onClick={() => removeMaterial(idx)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={13}/></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {Math.abs(totalPesoInformado - pesoLiquido) > 2 && totalPesoInformado > 0 && (
                        <div className={`mt-2 p-2 rounded border text-right ${
totalPesoInformado > pesoLiquido 
? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
}`}>
                            <div className="flex items-center justify-end gap-1 font-bold text-xs mb-0.5">
                                <AlertTriangle size={14}/>
                                <span>
                                    {totalPesoInformado < pesoLiquido 
                                        ? `Faltam ${(pesoLiquido - totalPesoInformado).toLocaleString()} kg para fechar a carga.`
                                        : `Passou ${(totalPesoInformado - pesoLiquido).toLocaleString()} kg do peso da balança.`
                                    }
                                </span>
                            </div>
                            <div className="text-[10px] opacity-80 font-bold">
                                Balança: {pesoLiquido.toLocaleString()} kg | Digitado: {totalPesoInformado.toLocaleString()} kg 
                            </div>
                        </div>
                    )}


                </div>

                {/* DIMENSÕES E TARA */}
                <div className="lg:col-span-2 space-y-4 border-r border-slate-200 dark:border-slate-700 pr-4 flex flex-col justify-center">
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Peso Bruto</span>
                            <div className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border dark:border-slate-700">
                                {pesoBruto.toLocaleString()} kg
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Tara Estimada</span>
                            <input type="number" className="w-full font-mono text-sm font-bold bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded outline-none disabled:opacity-60"
                                value={formData.peso_tara > 0 ? formData.peso_tara : ''} onChange={e=>setFormData({...formData, peso_tara: Number(e.target.value)})} disabled={isFinalizado} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1 flex justify-between">
                            <span>Dimensões (m)</span>
                            <span>Vol: <b className="text-blue-600">{vol.toFixed(2)} m³</b></span>
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                            {['comprimento', 'largura', 'altura'].map(f => {
                                const fieldName = `dim_${f}` as keyof EventoLPR;
                                const valorAtual = Number(formData[fieldName] || 0);
                                return (
                                    <input 
                                        key={f} 
                                        type="number" 
                                        placeholder={f[0].toUpperCase()}
                                        className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded px-1 py-1 text-center text-xs font-mono dark:text-white disabled:opacity-60"
                                        value={valorAtual > 0 ? valorAtual : ''} 
                                        onChange={e => setFormData({...formData, [fieldName]: Number(e.target.value)})}
                                        disabled={isFinalizado}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RESULTADOS FINAIS */}
                <div className="lg:col-span-3 flex flex-col justify-between h-full">
                    <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Status da Carga</span>

                        {totalPesoInformado > 0 && vol > 0 && mediaImpurezaFinal > 3.0 ? (
                            <button 
                                onClick={async () => {
                                    setGerandoPdf(true);
                                    await gerarPDFTicket(formData);
                                    setGerandoPdf(false);
                                }}
                                disabled={gerandoPdf}
                                title="Baixar dossiê R.I.M"
                                className={`mt-2 w-full py-2 px-2 rounded border flex flex-col items-center justify-center gap-1 shadow-sm transition-all duration-300 bg-red-100 hover:bg-red-200 dark:bg-red-900/80 dark:hover:bg-red-800 border-red-500 text-red-700 dark:text-red-100 ${gerandoPdf ? 'opacity-50 cursor-not-allowed' : 'animate-pulse hover:scale-[1.02]'}`}
                            >
                                <span className="font-bold text-xs flex items-center gap-1">
                                    <FileWarning size={14}/> {statusTexto}
                                </span>
                                <div className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                    <Download size={10}/> {gerandoPdf ? 'A Gerar...' : 'Baixar PDF (R.I.M)'}
                                </div>
                            </button>
                        ) : (
                                <div className={`mt-2 w-full py-2 px-3 rounded border flex items-center justify-center gap-2 font-bold text-xs shadow-sm transition-all duration-300 ${statusBg} ${statusCor}`}>
                                    {icone} {statusTexto}
                                </div>
                            )}

                        <div className="mt-4 flex justify-between items-end border-b border-slate-100 dark:border-slate-700 pb-2">
                            <span className="text-[10px] text-slate-400">Densidade Global</span>
                            <span className="text-xl font-mono font-bold text-slate-700 dark:text-white">{densidade.toFixed(3)}</span>
                        </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg text-center mt-2">
                        <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase block mb-1">Total a Pagar (Líquido)</span>
                        <span className="text-2xl font-mono font-bold text-green-800 dark:text-green-300 tracking-tight">
                            {pesoFinalTotal.toLocaleString()} <span className="text-xs">kg</span>
                        </span>
                        {descontoKgTotal > 0 && (
                            <div className="text-[9px] text-red-500 font-bold mt-1 bg-white/50 dark:bg-black/20 rounded px-1 inline-block">
                                - {descontoKgTotal.toFixed(0)} kg (Impureza Total)
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-6 pb-6 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 pt-4">
                <TruckVisualizer materiais={materiais} />
            </div>
        </div>
    );
}
