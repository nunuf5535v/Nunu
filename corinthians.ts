import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

// --- CONFIGURAÇÃO E TIPAGEM ---
interface Noticia {
    titulo: string;
    horario: string;
    link: string;
    imagem: string;
}

interface Jogo {
    campeonato: string;
    mandante: string;
    visitante: string;
    escudoMandante: string;
    escudoVisitante: string;
    info: string; // Placar ou Data/Hora
    status: 'agenda' | 'resultado';
}

const FALLBACK_IMG = 'https://s2-ge.glbimg.com/filters:format(webp)/g.globo/futebol/escudos/corinthians.svg';

// --- 1. O SCRAPER (A Lógica) ---
async function scrapTimao() {
    console.log('🦅 Vai Corinthians! Iniciando busca de dados...');

    try {
        // A) Notícias do GE
        const { data: geData } = await axios.get('https://ge.globo.com/futebol/times/corinthians/');
        const $ge = cheerio.load(geData);
        const noticias: Noticia[] = [];

        $ge('.feed-post-body').slice(0, 10).each((_, el) => {
            const titulo = $ge(el).find('.feed-post-body-title').text().trim();
            const link = $ge(el).find('a.feed-post-link').attr('href') || '#';
            const horario = $ge(el).find('.feed-post-datetime').text().trim();
            
            let imagem = $ge(el).find('img').attr('src') || $ge(el).find('img').attr('data-src');
            if (!imagem || imagem.includes('data:image')) imagem = FALLBACK_IMG;

            if (titulo) noticias.push({ titulo, horario, link, imagem: imagem as string });
        });

        // B) Próximos Jogos (Placar de Futebol)
        const { data: agendaData } = await axios.get('https://www.placardefutebol.com.br/time/corinthians/proximos-jogos');
        const $agenda = cheerio.load(agendaData);
        const agenda: Jogo[] = [];

        $agenda('.match__lg').each((_, el) => {
            const dataHoraArr = $agenda(el).find('.match__lg_card--datetime').html()?.split('<br>') || [];
            const data = dataHoraArr[0]?.trim().replace(',', '') || '';
            const hora = dataHoraArr[1]?.trim() || '';
            
            agenda.push({
                campeonato: $agenda(el).find('.match__lg_card--league').text().trim(),
                mandante: $agenda(el).find('.match__lg_card--ht-name').text().trim(),
                visitante: $agenda(el).find('.match__lg_card--at-name').text().trim(),
                escudoMandante: $agenda(el).find('.match__lg_card--ht-logo img').attr('src') || FALLBACK_IMG,
                escudoVisitante: $agenda(el).find('.match__lg_card--at-logo img').attr('src') || FALLBACK_IMG,
                info: `${data} • ${hora}`,
                status: 'agenda'
            });
        });

        // C) Últimos Resultados
        const { data: ultimosData } = await axios.get('https://www.placardefutebol.com.br/time/corinthians/ultimos-jogos');
        const $ultimos = cheerio.load(ultimosData);
        const resultados: Jogo[] = [];

        $ultimos('.match__lg').slice(0, 5).each((_, el) => {
            resultados.push({
                campeonato: $ultimos(el).find('.match__lg_card--league').text().trim(),
                mandante: $ultimos(el).find('.match__lg_card--ht-name').text().trim(),
                visitante: $ultimos(el).find('.match__lg_card--at-name').text().trim(),
                escudoMandante: $ultimos(el).find('.match__lg_card--ht-logo img').attr('src') || FALLBACK_IMG,
                escudoVisitante: $ultimos(el).find('.match__lg_card--at-logo img').attr('src') || FALLBACK_IMG,
                info: $ultimos(el).find('.match__lg_card--scoreboard').text().trim(),
                status: 'resultado'
            });
        });

        // --- 2. O GERADOR DE HTML (O Design) ---
        console.log('🎨 Pintando o mundo de Preto e Branco...');
        const htmlFinal = renderHTML(noticias, agenda, resultados);

        // Salva o arquivo final
        fs.writeFileSync('/Nunu/orinthians.html', htmlFinal);
        console.log('✅ SUCESSO! Abra o arquivo "corinthians.html" no seu navegador.');

    } catch (error) {
        console.error('❌ Deu ruim:', error);
    }
}

// Função que retorna a String do HTML Completo
function renderHTML(noticias: Noticia[], agenda: Jogo[], resultados: Jogo[]) {
    const proximoJogo = agenda[0]; // Pega o primeiro jogo da lista

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel do Timão</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Inter:wght@300;400;700&display=swap" rel="stylesheet">
    <style>
        body { background-color: #000; color: #fff; font-family: 'Inter', sans-serif; }
        h1, h2, h3, .font-display { font-family: 'Rajdhani', sans-serif; text-transform: uppercase; }
        .glass { background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .gold-accent { color: #D4AF37; }
        .border-gold { border-color: #D4AF37; }
        .bg-gold { background-color: #D4AF37; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 10px 30px -10px rgba(212, 175, 55, 0.2); border-color: #D4AF37; }
        .transition-all { transition: all 0.3s ease; }
    </style>
</head>
<body class="min-h-screen bg-[url('https://www.timaoweb.com.br/wp-content/uploads/2022/08/arena-neo-quimica-fiel.jpg')] bg-fixed bg-cover bg-center bg-no-repeat">
    
    <div class="fixed inset-0 bg-gradient-to-b from-black/90 via-black/80 to-black pointer-events-none z-0"></div>

    <div class="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        
        <header class="flex items-center justify-between mb-10 pb-4 border-b border-white/10">
            <div class="flex items-center gap-3">
                <img src="https://s2-ge.glbimg.com/filters:format(webp)/g.globo/futebol/escudos/corinthians.svg" class="w-14 h-14 drop-shadow-lg">
                <div>
                    <h1 class="text-3xl font-bold leading-none tracking-wider">Corinthians</h1>
                    <p class="text-xs text-gray-400 font-sans tracking-widest">SCCP • 1910</p>
                </div>
            </div>
            <div class="hidden md:block text-right">
                <p class="text-sm text-gray-400">Atualizado em</p>
                <p class="font-mono text-gold-accent">${new Date().toLocaleString('pt-BR')}</p>
            </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div class="lg:col-span-4 space-y-8">
                
                ${proximoJogo ? `
                <div class="glass rounded-2xl p-6 border-l-4 border-gold relative overflow-hidden group">
                    <div class="absolute top-0 right-0 bg-gold text-black text-xs font-bold px-3 py-1 rounded-bl-lg">PRÓXIMO JOGO</div>
                    <h2 class="text-xl font-bold mb-4 text-gray-200">${proximoJogo.campeonato}</h2>
                    
                    <div class="flex justify-between items-center mb-6">
                        <div class="flex flex-col items-center w-1/3">
                            <img src="${proximoJogo.escudoMandante}" class="w-16 h-16 object-contain mb-2 drop-shadow">
                            <span class="text-sm font-bold text-center leading-tight">${proximoJogo.mandante}</span>
                        </div>
                        <div class="text-2xl font-bold text-gray-500 font-display">VS</div>
                        <div class="flex flex-col items-center w-1/3">
                            <img src="${proximoJogo.escudoVisitante}" class="w-16 h-16 object-contain mb-2 drop-shadow">
                            <span class="text-sm font-bold text-center leading-tight">${proximoJogo.visitante}</span>
                        </div>
                    </div>
                    
                    <div class="text-center bg-white/5 rounded-lg py-2 border border-white/5">
                        <span class="text-gold-accent font-bold font-mono tracking-widest">${proximoJogo.info}</span>
                    </div>
                </div>
                ` : ''}

                <div class="glass rounded-2xl p-6">
                    <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-gray-500"></span> Últimos Resultados
                    </h3>
                    <div class="space-y-4">
                        ${resultados.map(res => `
                        <div class="flex items-center justify-between text-sm pb-3 border-b border-white/5 last:border-0 last:pb-0">
                            <div class="flex items-center gap-2 w-[40%]">
                                <img src="${res.escudoMandante}" class="w-6 h-6">
                                <span class="truncate text-gray-300">${res.mandante}</span>
                            </div>
                            <span class="font-bold font-mono text-gold-accent bg-black/40 px-2 py-0.5 rounded">${res.info}</span>
                            <div class="flex items-center gap-2 w-[40%] justify-end">
                                <span class="truncate text-gray-300">${res.visitante}</span>
                                <img src="${res.escudoVisitante}" class="w-6 h-6">
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="lg:col-span-8">
                <h2 class="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span class="w-1 h-6 bg-gold block"></span>
                    Últimas do Timão
                </h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${noticias.map(news => `
                    <a href="${news.link}" target="_blank" class="glass rounded-xl overflow-hidden card-hover transition-all group flex flex-col">
                        <div class="h-48 overflow-hidden relative">
                            <img src="${news.imagem}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                            <span class="absolute bottom-2 right-2 text-[10px] bg-black/80 backdrop-blur text-white px-2 py-1 rounded uppercase tracking-wider">Ler mais</span>
                        </div>
                        <div class="p-5 flex-1 flex flex-col justify-between">
                            <h3 class="text-lg leading-tight font-semibold text-gray-100 group-hover:text-gold-accent transition-colors mb-3">
                                ${news.titulo}
                            </h3>
                            <div class="flex items-center gap-2 text-xs text-gray-500 font-sans mt-auto">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                ${news.horario}
                            </div>
                        </div>
                    </a>
                    `).join('')}
                </div>
            </div>
        </div>

        <footer class="mt-12 text-center text-gray-600 text-sm py-8 border-t border-white/10">
            <p>Desenvolvido para a Fiel Torcida.</p>
        </footer>
    </div>
</body>
</html>
    `;
}

// Rodar o script
scrapTimao();
