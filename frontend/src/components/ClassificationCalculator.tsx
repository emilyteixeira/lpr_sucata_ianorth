import React, { useEffect, useState } from 'react';
import { Calculator, Scale, Box, Percent, CheckCircle, AlertTriangle, Save, Info, Trash2, Plus } from 'lucide-react';
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

const MAX_VOLUME_REF = 110; 

interface Props {
    formData: Partial<EventoLPR>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<EventoLPR>>>;
    ticket: EventoLPR | null;
}

interface MaterialItem {
    tipo: string;
    pct: number;
}

export function ClassificationCalculator({ formData, setFormData, ticket }: Props) {
    const [saving, setSaving] = useState(false);
    const [materiais, setMateriais] = useState<MaterialItem[]>([]);

    useEffect(() => {
        if (ticket?.tipo_sucata && materiais.length === 0) {
            if (ticket.tipo_sucata.includes('=')) {
                const itens = ticket.tipo_sucata.split(';').map(s => {
                    const [tipo, val] = s.split('=');
                    return { tipo: tipo?.trim(), pct: Number(val) || 0 };
                });
                setMateriais(itens);
            } else {
                setMateriais([{ tipo: ticket.tipo_sucata, pct: 100 }]);
            }
        } else if (materiais.length === 0) {
            setMateriais([]); 
        }
    }, [ticket]);

    useEffect(() =>{
        if (materiais.length > 0){
            const stringSalva = materiais.map(m => `${m.tipo}=${m.pct}`).join(';');
            setFormData(prev => ({...prev, tipo_sucata: stringSalva}));
        }
    }, [materiais, setFormData]);

    const addMaterial = () => {
        setMateriais([...materiais, {tipo: "", pct: 0 }]);
    };

    const removeMaterial = (idx: number) => {
        const nova = [...materiais];
        nova.splice(idx, 1);
        setMateriais(nova);
    };

    const updateMaterial = (idx: number, field: keyof MaterialItem, value: any) =>{
        const nova = [...materiais];
        nova[idx] = {...nova[idx], [field]: value };
        setMateriais(nova);
    };

    // Lógica de Cálculo
    const pesoBruto = ticket?.peso_balanca || 0;
    const pesoTara = Number(formData.peso_tara) || 0;
    const pesoLiquido = Math.max(0, pesoBruto - pesoTara);
    const pesoTon = pesoLiquido / 1000;

    const comp = Number(formData.dim_comprimento) || 0;
    const larg = Number(formData.dim_largura) || 0;
    const alt = Number(formData.dim_altura) || 0;
    const volumeM3 = comp * larg * alt;

    const densidade = volumeM3 > 0 ? (pesoTon / volumeM3) : 0;
    const impurezaPct = Number(formData.impureza_porcentagem) || 0;
    const descontoKg = pesoLiquido * (impurezaPct / 100);
    const pesoFinal = pesoLiquido - descontoKg;

    let minIdeal = 0;
    let maxIdeal = 0;
    let totalPct = 0;

    materiais.forEach(m => {
        const range = DENSITY_RANGES[m.tipo];
        if (range){
            const peso = m.pct / 100;
            minIdeal += range[0] * peso;
            maxIdeal += range[1] * peso;
            totalPct += m.pct;
        }
    });
    
    let statusDensidade = "Aguardando dados";
    let statusColor = "text-slate-400";
    let statusBg = "bg-slate-100 dark:bg-slate-700";
    
    if (totalPct > 0 && volumeM3 > 0 && materiais.length > 0) {
        // Normaliza para 100% caso o usuário digite menos
        const fator = totalPct === 100 ? 1 : (100 / totalPct);
        const minFinal = minIdeal * fator;
        const maxFinal = maxIdeal * fator;

        if (densidade < minFinal) { 
            statusDensidade = "ABAIXO DA FAIXA"; 
            statusColor = "text-red-600"; 
            statusBg = "bg-red-50 border-red-200"; }
        else if (densidade > maxFinal) { 
            statusDensidade = "ACIMA DA FAIXA"; 
            statusColor = "text-orange-600";
            statusBg = "bg-orange-50 border-orange-200"; }
        else { 
            statusDensidade = "NA FAIXA"; 
            statusColor = "text-green-700";
            statusBg = "bg-green-50 border-green-200"; }
    }

    const handleSaveCalculation = async () => {
        if (!ticket) return;
        setSaving(true);
        try {
            await fetch(`${API_BASE_URL}/eventos/${ticket.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    peso_tara: pesoTara,
                    dim_comprimento: comp,
                    dim_largura: larg,
                    dim_altura: alt,
                    impureza_porcentagem: impurezaPct,
                    tipo_sucata: formData.tipo_sucata,
                })
            });
            alert("Classificação salva com sucesso!");
        } catch (e) {
            alert("Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2 dark:text-white text-lg">
                    <Calculator size={20} className="text-green-600"/> Classificação & Cubagem
                </h3>
                <button 
                    onClick={handleSaveCalculation}
                    disabled={saving}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all disabled:opacity-50"
                >
                    <Save size={18}/> {saving ? 'Salvando...' : 'SALVAR CÁLCULO'}
                </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* SELEÇÃO DE MATERIAIS */}
                <div className="md:col-span-4 space-y-3 border-r border-slate-100 dark:border-slate-700 pr-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">Composição da Carga</h4>
                        <button onClick={addMaterial} className="text-xs flex items-center gap-1 text-blue-600 font-bold hover:underline">
                            <Plus size={12}/> Adicionar Tipo
                        </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {materiais.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-700">
                                <select 
                                    className="flex-1 bg-transparent text-xs font-bold text-slate-700 dark:text-white outline-none"
                                    value={item.tipo}
                                    onChange={(e) => updateMaterial(idx, 'tipo', e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {Object.keys(DENSITY_RANGES).map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                                <div className="flex items-center gap-1 w-16">
                                    <input type="number" className="w-full bg-white dark:bg-slate-800 border rounded px-1 text-center text-xs font-bold"
                                        placeholder="%" value={item.pct || ''}
                                        onChange={(e) => updateMaterial(idx, 'pct', Number(e.target.value))}
                                    />
                                    <span className="text-[10px] text-slate-400">%</span>
                                </div>
                                <button onClick={() => removeMaterial(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                    {totalPct !== 100 && totalPct > 0 && <div className="text-[10px] text-orange-500">Soma atual: {totalPct}%</div>}
                </div>

                {/* PESOS E DIMENSÕES */}
                <div className="md:col-span-5 grid grid-cols-2 gap-6 border-r border-slate-100 dark:border-slate-700 pr-4">
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Scale size={12}/> Pesagem</h4>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-slate-500">Bruto</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{pesoBruto.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold">Tara (kg)</span>
                            <input type="number" className="w-20 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded px-2 py-1 text-right font-mono font-bold text-slate-700 dark:text-white outline-none"
                                value={formData.peso_tara || ''} onChange={e=>setFormData({...formData, peso_tara: Number(e.target.value)})}/>
                        </div>
                        <div className="pt-2 border-t flex justify-between items-center">
                            <span className="text-xs font-bold text-green-600">LÍQUIDO</span>
                            <span className="font-mono font-bold text-lg text-green-700 dark:text-green-400">{pesoLiquido.toLocaleString()} kg</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Box size={12}/> Cubagem (m)</h4>
                        <div className="grid grid-cols-3 gap-1">
                            {['comprimento', 'largura', 'altura'].map((f) => (
                                <div key={f}>
                                    <input type="number" placeholder={f.substr(0,1).toUpperCase()} 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border rounded px-1 py-1 text-center font-mono text-xs outline-none"
                                        value={formData[`dim_${f}` as keyof EventoLPR] || ''} 
                                        onChange={e=>setFormData({...formData, [`dim_${f}`]: Number(e.target.value)})}/>
                                </div>
                            ))}
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-center border border-blue-100 dark:border-blue-800">
                            <span className="text-[10px] font-bold text-blue-600 block uppercase">Volume Total</span>
                            <span className="text-xl font-mono font-bold text-blue-700 dark:text-blue-400">{volumeM3.toFixed(2)} m³</span>
                        </div>
                    </div>
                </div>

                {/* RESULTADOS E IMPUREZA */}
                <div className="md:col-span-3 space-y-4 flex flex-col justify-between">
                    <div className="text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Densidade Real</span>
                        <span className="text-3xl font-mono font-bold text-slate-800 dark:text-white">{densidade.toFixed(3)}</span>
                        <div className={`mt-1 text-[10px] font-bold px-2 py-1 rounded border inline-flex items-center gap-1 ${statusBg} ${statusColor}`}>
                            {statusDensidade.includes("OK") || statusDensidade.includes("NA FAIXA") ? <CheckCircle size={10}/> : <AlertTriangle size={10}/>}
                            {statusDensidade}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-red-500 uppercase"><Percent size={10} className="inline"/> Impureza</span>
                            <div className="flex items-center gap-1">
                                <input type="number" className="w-12 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded px-1 py-0.5 text-right font-mono text-sm font-bold text-red-600 outline-none"
                                    value={formData.impureza_porcentagem || ''} onChange={e=>setFormData({...formData, impureza_porcentagem: Number(e.target.value)})}/>
                                <span className="text-xs text-red-500">%</span>
                            </div>
                        </div>
                        <div className="text-right text-[10px] text-red-400 font-mono border-t border-red-100 pt-1">
                            Desconto: {descontoKg.toFixed(0)} kg
                        </div>
                    </div>

                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded border border-green-200 dark:border-green-800 text-center">
                        <span className="text-[10px] font-bold text-green-800 dark:text-green-500 uppercase block">A Pagar</span>
                        <span className="text-xl font-mono font-bold text-green-900 dark:text-green-300">{pesoFinal.toLocaleString()} <span className="text-xs">kg</span></span>
                    </div>
                </div>
            </div>

            <div className="px-6 pb-6 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 pt-4">
                <TruckVisualizer volume={volumeM3} maxVolume={MAX_VOLUME_REF} impurezaPct={impurezaPct} />
            </div>
        </div>
    );
}
