'use client';
import { OnlineCareRoom } from '@/components/online-care-room';
import { BrandLogo } from '@/components/brand-logo';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
export default function AtendimentoPage(){const params=useParams<{token:string}>(),[room,setRoom]=useState<{patientName:string;logotipo_url?:string}|null>(null),[error,setError]=useState('');useEffect(()=>{fetch(`/api/atendimento/${params.token}`).then(async response=>{if(!response.ok)throw new Error('Este link de atendimento não está disponível.');setRoom(await response.json())}).catch(cause=>setError(cause.message))},[params.token]);return <main className="patient-room-page"><header><BrandLogo customLogoUrl={room?.logotipo_url || undefined}/><span>Atendimento online seguro</span></header>{error?<div className="online-prejoin"><h2>Atendimento indisponível</h2><p>{error}</p></div>:room?<OnlineCareRoom token={params.token} role="patient" name="seu profissional"/>:<div className="online-prejoin"><p>Preparando a sala...</p></div>}</main>}
