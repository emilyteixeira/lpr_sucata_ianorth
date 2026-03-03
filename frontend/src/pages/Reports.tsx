import React, { useEffect, useState } from 'react';

// @ts-ignore
import Responsive from 'react-grid-layout/build/ResponsiveReactGridLayout';
// @ts-ignore
import WidthProvider from 'react-grid-layout/build/components/WidthProvider';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Scale, AlertTriangle, Filter, GripHorizontal, BarChart3 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import type { EventoLPR } from '../types';

const ResponsiveGridLayout = WidthProvider(Responsive);


const CORES = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export function Reports() {
    const [eventos, setEventos] = useState<EventoLPR[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroDias, setFiltroDias] = useState(7);

    const defaultLayout = [
        { i: 'kpi-peso', x: 0, y: 0, w: 4, h: 1, minW: 2, minH: 1 },
        { i: 'kpi-viagens', x: 4, y: 0, w: 4, h: 1, minW: 2, minH: 1 },
        { i: 'kpi-impureza', x: 8, y: 0, w: 4, h: 1, minW: 2, minH: 1 },
        { i: 'chart-curva', x: 0, y: 1, w: 8, h: 3, minW: 4, minH: 2 },
        { i: 'chart-pizza', x: 8, y: 1, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'chart-barras', x: 0, y: 4, w: 12, h: 3, minW: 6, minH: 2 }
    ];

    useEffect(() => {
        fetch(`${API_BASE_URL}/eventos/?limit=1000`)
            .then(res => res.json())
            .then(data => {
                const finalizados = data.filter((e: EventoLPR) => e.status_ticket === 'Finalizado');
                setEventos(finalizados);
                setLoading(false);
            })
            .catch(err => console.error("Erro ao carregar BI:", err));
    }, []);

    if (loading) return <div className="p-10 text-center text-slate-500 font-bold animate-pulse flex flex-col items-center justify-center h-full"><BarChart3 size={40} className="mb-4 text-blue-500"/> Carregando BI...</div>;

    const hoje = new Date();
    const dataCorte = new Date();
    dataCorte.setDate(hoje.getDate() - filtroDias);

    const eventosFiltrados = eventos.filter(e => {
        const dataStr = e.timestamp_registro.split(' ')[0];
        const [ano, mes, dia] = dataStr.split('-');
        const dataEvento = new Date(Number(ano), Number(mes)-1, Number(dia));
        return filtroDias === 9999 ? true : (dataEvento >= dataCorte);
    });

    const totalPeso = eventosFiltrados.reduce((acc, curr) => acc + (curr.peso_liquido || 0), 0);
    const totalImpureza = eventosFiltrados.reduce((acc, curr) => acc + (curr.desconto_kg || 0), 0);
    const pctImpurezaGeral = totalPeso > 0 ? (totalImpureza / totalPeso) * 100 : 0;

    const volumePorDia = eventosFiltrados.reduce((acc: any, curr) => {
        const dia = curr.timestamp_registro.split(' ')[0];
        if (!acc[dia]) acc[dia] = { data: dia, peso: 0 };
        acc[dia].peso += (curr.peso_liquido || 0) / 1000; 
        return acc;
    }, {});
    const dadosLinhaTempo = Object.values(volumePorDia).sort((a: any, b: any) => a.data.localeCompare(b.data));

    const volumePorSucata = eventosFiltrados.reduce((acc: any, curr) => {
        const tipo = curr.tipo_sucata ? curr.tipo_sucata.split('=')[0].trim() : 'Outros';
        if (!acc[tipo]) acc[tipo] = { name: tipo, value: 0 };
        acc[tipo].value += (curr.peso_liquido || 0) / 1000;
        return acc;
    }, {});
    const dadosPizza = Object.values(volumePorSucata).sort((a: any, b: any) => b.value - a.value).slice(0, 5);

    const volumePorFornecedor = eventosFiltrados.reduce((acc: any, curr) => {
        const forn = curr.fornecedor_nome || 'Não Identificado';
        if (!acc[forn]) acc[forn] = { nome: forn, tonelagem: 0 };
        acc[forn].tonelagem += (curr.peso_liquido || 0) / 1000;
        return acc;
    }, {});
    const dadosFornecedores = Object.values(volumePorFornecedor).sort((a: any, b: any) => b.tonelagem - a.tonelagem).slice(0, 5);

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-[1600px] mx-auto pt-2">
            
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Relatórios & BI</h1>
                    <p className="text-sm text-slate-500">Métricas dinâmicas do fluxo de sucata</p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-slate-400" />
                    <select 
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 font-bold text-sm text-slate-700 dark:text-white outline-none focus:ring-2 ring-blue-500 cursor-pointer"
                        value={filtroDias}
                        onChange={(e) => setFiltroDias(Number(e.target.value))}
                    >
                        <option value={1}>Últimas 24h</option>
                        <option value={7}>Últimos 7 Dias</option>
                        <option value={15}>Últimos 15 Dias</option>
                        <option value={30}>Últimos 30 Dias</option>
                        <option value={9999}>Todo o Período</option>
                    </select>
                </div>
            </div>

            <div className="-mx-2">
                <ResponsiveGridLayout 
                    className="layout" 
                    layouts={{ lg: defaultLayout as any }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={120}
                    draggableHandle=".drag-handle"
                    margin={[20, 20]}
                >
                    
                    <div key="kpi-peso" className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-blue-500 flex flex-col justify-center relative group">
                        <GripHorizontal className="drag-handle absolute top-2 right-2 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition" size={16}/>
                        <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><TrendingUp size={14}/> Volume Recebido</p>
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{(totalPeso / 1000).toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-sm font-normal">Ton</span></h2>
                    </div>

                    <div key="kpi-viagens" className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-green-500 flex flex-col justify-center relative group">
                        <GripHorizontal className="drag-handle absolute top-2 right-2 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition" size={16}/>
                        <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Scale size={14}/> Tickets Finalizados</p>
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{eventosFiltrados.length} <span className="text-sm font-normal">Caminhões</span></h2>
                    </div>

                    <div key="kpi-impureza" className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-red-500 flex flex-col justify-center relative group">
                        <GripHorizontal className="drag-handle absolute top-2 right-2 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition" size={16}/>
                        <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><AlertTriangle size={14}/> Média de Impureza</p>
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{pctImpurezaGeral.toFixed(1)} <span className="text-sm font-normal">%</span></h2>
                    </div>

                    {/* GRÁFICO DE LINHA */}
                    <div key="chart-curva" className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col relative group">
                        <div className="flex justify-between items-center mb-4 cursor-move drag-handle">
                            <h3 className="font-bold text-sm text-slate-500 uppercase">Volume Diário (Toneladas)</h3>
                            <GripHorizontal className="text-slate-300 opacity-0 group-hover:opacity-100 transition" size={16}/>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dadosLinhaTempo}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" opacity={0.2} />
                                    <XAxis dataKey="data" tick={{fontSize: 11, fill: '#64748b'}} tickMargin={10} />
                                    <YAxis tick={{fontSize: 11, fill: '#64748b'}} />
                                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                                    <Line type="monotone" dataKey="peso" name="Toneladas" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb'}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* GRÁFICO DE PIZZA */}
                    <div key="chart-pizza" className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col relative group">
                        <div className="flex justify-between items-center mb-2 cursor-move drag-handle">
                            <h3 className="font-bold text-sm text-slate-500 uppercase">Top 5 Materiais Recebidos</h3>
                            <GripHorizontal className="text-slate-300 opacity-0 group-hover:opacity-100 transition" size={16}/>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dadosPizza} cx="50%" cy="45%" innerRadius="55%" outerRadius="80%" paddingAngle={5} dataKey="value" nameKey="name">
                                        {dadosPizza.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: number) => `${value.toFixed(1)} Ton`} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', color: '#64748b'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* GRÁFICO DE BARRAS */}
                    <div key="chart-barras" className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col relative group">
                        <div className="flex justify-between items-center mb-4 cursor-move drag-handle">
                            <h3 className="font-bold text-sm text-slate-500 uppercase">Top 5 Fornecedores (Toneladas)</h3>
                            <GripHorizontal className="text-slate-300 opacity-0 group-hover:opacity-100 transition" size={16}/>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dadosFornecedores} layout="vertical" margin={{ left: 50, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#64748b" opacity={0.2} />
                                    <XAxis type="number" tick={{fontSize: 11, fill: '#64748b'}} />
                                    <YAxis dataKey="nome" type="category" width={150} tick={{fontSize: 11, fill: '#64748b'}} />
                                    <RechartsTooltip cursor={{fill: 'rgba(100, 116, 139, 0.1)'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                                    <Bar dataKey="tonelagem" name="Toneladas" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={25}>
                                        {dadosFornecedores.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </ResponsiveGridLayout>
            </div>
        </div>
    );
}
