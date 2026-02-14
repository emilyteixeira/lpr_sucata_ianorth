import React, { useEffect, useState } from 'react';
import { Calculator, Scale, Save, Plus, Trash2, FileWarning, CheckCircle, AlertTriangle } from 'lucide-react';
import { TruckVisualizer } from './TruckVisualizer';
import type { EventoLPR } from '../types';
import { API_BASE_URL } from '../config';

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
}

interface MaterialItem {
    tipo: string;
    pct: number;
    impureza: number;
}

export function ClassificationCalculator({ formData, setFormData, ticket }: Props) {
    const [saving, setSaving] = useState(false);
    const [materiais, setMateriais] = useState<MaterialItem[]>([]);

    useEffect(() => {
        if (ticket?.tipo_sucata && materiais.length === 0) {
            if (ticket.tipo_sucata.includes('=')) {
                const itens = ticket.tipo_sucata.split(';').map(s => {
                    const [tipo, resto] = s.split('=');
                    const [pct, imp] = (resto || '0').includes('|') ? resto.split('|') : [resto, '0'];
                    return { tipo: tipo?.trim(), pct: Number(pct) || 0, impureza: Number(imp) || 0 };
                });
                setMateriais(itens);
            } else {
                setMateriais([{ tipo: ticket.tipo_sucata, pct: 100, impureza: 0 }]);
            }
        } else if (materiais.length === 0) {
             setMateriais([{ tipo: "", pct: 100, impureza: 0 }]);
        }
    }, [ticket]);

    useEffect(() => {
        if (materiais.length > 0) {
            const str = materiais.map(m => `${m.tipo}=${m.pct}|${m.impureza}`).join(';');
            setFormData(prev => ({...prev, tipo_sucata: str}));
        }
    }, [materiais, setFormData]);

    const addMaterial = () => setMateriais([...materiais, { tipo: "", pct: 0, impureza: 0 }]);
    const removeMaterial = (idx: number) => { const n = [...materiais]; n.splice(idx,1); setMateriais(n); };
    
    const updateMaterial = (idx: number, field: keyof MaterialItem, val: any) => {
        const n = [...materiais]; n[idx] = { ...n[idx], [field]: val };
        setMateriais(n);
    };

    const pesoBruto = ticket?.peso_balanca || 0;
    const pesoTara = Number(formData.peso_tara) || 0;
    const pesoLiquido = Math.max(0, pesoBruto - pesoTara);
    const vol = (Number(formData.dim_comprimento)||0) * (Number(formData.dim_largura)||0) * (Number(formData.dim_altura)||0);
    
    let totalPctVolume = 0;
    let impurezaPonderada = 0;
    let minIdeal = 0; 
    let maxIdeal = 0;

    materiais.forEach(m => {
        const pesoRelativo = m.pct / 100;
        totalPctVolume += m.pct;
        impurezaPonderada += (m.impureza * pesoRelativo);
        const range = DENSITY_RANGES[m.tipo];
        if (range) {
            minIdeal += range[0] * pesoRelativo;
            maxIdeal += range[1] * pesoRelativo;
        }
    });

    const fatorNorm = totalPctVolume > 0 ? (100 / totalPctVolume) : 1;
    const mediaImpurezaFinal = impurezaPonderada * fatorNorm;
    const minFinal = minIdeal * fatorNorm;
    const maxFinal = maxIdeal * fatorNorm;
    const densidade = vol > 0 ? ((pesoLiquido / 1000) / vol) : 0;
    const descontoKg = pesoLiquido * (mediaImpurezaFinal / 100);
    const pesoFinal = pesoLiquido - descontoKg;

    let statusTexto = "Aguardando dados";
    let statusCor = "text-slate-400";
    let statusBg = "bg-slate-100 dark:bg-slate-800 border-slate-200";
    let icone = <Scale size={14}/>;

    if (totalPctVolume > 0 && vol > 0) {
        if (mediaImpurezaFinal > 3.0) {
            statusTexto = `ALERTA R.I.M. (${mediaImpurezaFinal.toFixed(1)}%)`;
            statusCor = "text-red-700 dark:text-red-100";
            statusBg = "bg-red-100 dark:bg-red-900 border-red-500 animate-pulse";
            icone = <FileWarning size={14}/>;
        } else if (densidade < minFinal) {
            statusTexto = "DENSIDADE BAIXA";
            statusCor = "text-orange-700 dark:text-orange-200";
            statusBg = "bg-orange-100 dark:bg-orange-900/50 border-orange-300";
            icone = <AlertTriangle size={14}/>;
        } else if (densidade > maxFinal) {
            statusTexto = "DENSIDADE ALTA";
            statusCor = "text-orange-700 dark:text-orange-200";
            statusBg = "bg-orange-100 dark:bg-orange-900/50 border-orange-300";
            icone = <AlertTriangle size={14}/>;
        } else {
            statusTexto = "APROVADO / NA FAIXA";
            statusCor = "text-green-700 dark:text-green-200";
            statusBg = "bg-green-100 dark:bg-green-900/50 border-green-300";
            icone = <CheckCircle size={14}/>;
        }
    }

    const handleSave = async () => {
        setSaving(true);
        try {
             await fetch(`${API_BASE_URL}/eventos/${ticket?.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    peso_tara: pesoTara,
                    dim_comprimento: Number(formData.dim_comprimento),
                    dim_largura: Number(formData.dim_largura),
                    dim_altura: Number(formData.dim_altura),
                    impureza_porcentagem: mediaImpurezaFinal,
                    tipo_sucata: formData.tipo_sucata,
                })
            });
            alert("Classificação salva com sucesso!");
        } catch(e) { alert("Erro ao salvar."); } finally { setSaving(false); }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-6 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold flex items-center gap-2 dark:text-white">
                    <Calculator size={20} className="text-green-600"/> Classificação & Cubagem
                </h3>
                <button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2">
                    <Save size={16}/> {saving ? 'Salvando...' : 'Salvar Cálculo'}
                </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* LISTA DE MATERIAIS */}
                <div className="md:col-span-6 space-y-3 border-r border-slate-200 dark:border-slate-700 pr-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase">Composição da Carga</h4>
                        <button onClick={addMaterial} className="text-xs text-blue-600 font-bold flex gap-1 hover:underline"><Plus size={12}/> Adicionar</button>
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {materiais.map((m, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                                {/* Select */}
                                <div className="col-span-5">
                                    <label className="block text-[8px] text-slate-400 font-bold mb-0.5">TIPO SUCATA</label>
                                    <select className="w-full bg-white dark:bg-slate-700 border dark:border-slate-600 text-[10px] font-bold text-slate-800 dark:text-white rounded px-1 py-1 outline-none"
                                        value={m.tipo} onChange={e => updateMaterial(idx, 'tipo', e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {Object.keys(DENSITY_RANGES).map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                </div>
                                {/* Vol % */}
                                <div className="col-span-3">
                                    <label className="block text-[8px] text-slate-400 font-bold mb-0.5 text-center">VOL %</label>
                                    <input type="number" className="w-full bg-white dark:bg-slate-700 border dark:border-slate-600 rounded px-1 py-1 text-center text-xs dark:text-white font-bold"
                                        value={m.pct} onChange={e => updateMaterial(idx, 'pct', Number(e.target.value))} />
                                </div>
                                {/* Imp % */}
                                <div className="col-span-3">
                                    <label className="block text-[8px] text-red-400 font-bold mb-0.5 text-center">IMP %</label>
                                    <input type="number" className="w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-1 py-1 text-center text-xs text-red-600 dark:text-red-300 font-bold"
                                        value={m.impureza} onChange={e => updateMaterial(idx, 'impureza', Number(e.target.value))} />
                                </div>
                                {/* Delete */}
                                <div className="col-span-1 flex justify-center pt-3">
                                    <button onClick={() => removeMaterial(idx)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {totalPctVolume !== 100 && (
                        <div className={`text-[10px] font-bold text-right ${totalPctVolume > 100 ? 'text-red-500' : 'text-orange-500'}`}>
                            Total: {totalPctVolume}% (Ajuste para 100%)
                        </div>
                    )}
                </div>

                {/* DIMENSÕES */}
                <div className="md:col-span-3 space-y-4 border-r border-slate-200 dark:border-slate-700 pr-4 flex flex-col justify-center">
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Peso Bruto</span>
                            <div className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border dark:border-slate-700">
                                {pesoBruto.toLocaleString()} kg
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Tara Estimada</span>
                            <input type="number" className="w-full font-mono text-sm font-bold bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded outline-none"
                                value={formData.peso_tara || ''} onChange={e=>setFormData({...formData, peso_tara: Number(e.target.value)})}/>
                        </div>
                    </div>
                    <div className="mt-2">
                        <span className="text-[10px] uppercase text-slate-400 font-bold mb-1 justify-between">
                            <span>Dimensões (m)</span>
                            <span>Vol: <b className="text-blue-600">{vol.toFixed(2)} m³</b></span>
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                            {['comprimento', 'largura', 'altura'].map(f => (
                                <input key={f} type="number" placeholder={f[0].toUpperCase()}
                                    className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded px-1 py-1 text-center text-xs font-mono dark:text-white"
                                    value={formData[`dim_${f}` as keyof EventoLPR] || ''} 
                                    onChange={e=>setFormData({...formData, [`dim_${f}`]: Number(e.target.value)})}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* RESULTADOS */}
                <div className="md:col-span-3 flex flex-col justify-between h-full">
                    <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                        <div className={`mt-2 w-full py-2 px-3 rounded border flex items-center justify-center gap-2 font-bold text-xs shadow-sm transition-all duration-300 ${statusBg} ${statusCor}`}>
                            {icone} {statusTexto}
                        </div>
                        <div className="mt-4 flex justify-between items-end border-b border-slate-100 dark:border-slate-700 pb-2">
                            <span className="text-[10px] text-slate-400">Densidade</span>
                            <span className="text-xl font-mono font-bold text-slate-700 dark:text-white">{densidade.toFixed(3)}</span>
                        </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg text-center mt-2">
                        <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase block mb-1">A Pagar (Líquido)</span>
                        <span className="text-2xl font-mono font-bold text-green-800 dark:text-green-300 tracking-tight">
                            {pesoFinal.toLocaleString()} <span className="text-xs">kg</span>
                        </span>
                        {descontoKg > 0 && (
                            <div className="text-[9px] text-red-500 font-bold mt-1 bg-white/50 dark:bg-black/20 rounded px-1">
                                - {descontoKg.toFixed(0)} kg (Desc. Impureza)
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
