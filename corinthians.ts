import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

// --- INTERFACES (Para garantir a tipagem profissional) ---
interface Noticia {
    titulo: string;
    horario: string;
    link: string;
    imagem: string | undefined;
}

interface JogoAgenda {
    liga: string;
    casa: string;
    fora: string;
    escudoCasa: string | undefined;
    escudoFora: string | undefined;
    data: string;
    hora: string;
}

interface JogoResultado {
    liga: string;
    casa: string;
    fora: string;
    placar: string;
    data: string;
    escudoCasa: string | undefined;
}

// --- FUNÇÃO PRINCIPAL ---
async function main() {
    console.log('🦅 Iniciando scraper do Timão...');

    try {
        // 1. SCRAPER DE NOTÍCIAS (GE)
        const { data: corinthiansData } = await axios.get('https://ge.globo.com/futebol/times/corinthians/');
        const $ = cheerio.load(corinthiansData);
        let noticias: Noticia[] = [];

        $('.feed-post-body').each((index, element) => {
            const titulo = $(element).find('.feed-post-body-title').first().text().trim();
            const horario = $(element).find('.feed-post-datetime').first().text().trim();
            const link = $(element).find('a.feed-post-link').attr('href') || '#';
            
            // Tenta pegar src, se não existir, tenta data-src (comum em lazy load)
            let imagem = $(element).find('img').attr('src');
            if (!imagem || imagem.includes('data:image')) {
                 imagem = $(element).find('img').attr('data-src');
            }

            if (titulo) {
                noticias.push({ titulo, horario, link, imagem });
            }
        });

        // 2. SCRAPER DA AGENDA (Placar de Futebol)
        const { data: agendaHtml } = await axios.get('https://www.placardefutebol.com.br/time/corinthians/proximos-jogos');
        const agenda$ = cheerio.load(agendaHtml);
        let agenda: JogoAgenda[] = [];

        agenda$('.match__lg').each((i, el) => {
            const dateTimeArr = agenda$(el).find('.match__lg_card--datetime').html()?.split('<br>');
            
            agenda.push({
                liga: agenda$(el).find('.match__lg_card--league').text().trim(),
                casa: agenda$(el).find('.match__lg_card--ht-name').text().trim(),
                fora: agenda$(el).find('.match__lg_card--at-name').text().trim(),
                escudoCasa: agenda$(el).find('.match__lg_card--ht-logo img').attr('src'),
                escudoFora: agenda$(el).find('.match__lg_card--at-logo img').attr('src'),
                data: dateTimeArr?.[0]?.trim().replace(',', '') || 'Data a confirmar',
                hora: dateTimeArr?.[1]?.trim() || ''
            });
        });

        // 3. SCRAPER DE RESULTADOS (Placar de Futebol)
        const { data: ultimosHtml } = await axios.get('https://www.placardefutebol.com.br/time/corinthians/ultimos-jogos');
        const ultimos$ = cheerio.load(ultimosHtml);
        let ultimos: JogoResultado[] = [];

        ultimos$('.match__lg').each((i, e) => {
            ultimos.push({
                liga: ultimos$(e).find('.match__lg_card--league').text().trim(),
                casa: ultimos$(e).find('.match__lg_card--ht-name').text().trim(),
                fora: ultimos$(e).find('.match__lg_card--at-name').text().trim(),
                placar: ultimos$(e).find('.match__lg_card--scoreboard').text().trim(),
                data: ultimos$(e).find('.match__lg_card--date').text().trim(),
                escudoCasa: ultimos$(e).find('.match__lg_card--ht-logo img').attr('src')
            });
        });

        // --- GERAÇÃO DO HTML ---
        console.log('🎨 Gerando HTML Premium...');
        const html = generateHTML(noticias, agenda, ultimos);
        
        fs.writeFileSync('index.html', html);
        console.log('✅ Arquivo index.html gerado com sucesso! Vai Corinthians!');

    } catch (error) {
        console.error('❌ Erro ao rodar o scraper:', error);
    }
}

// --- TEMPLATE HTML/CSS (DESIGN) ---
function generateHTML(noticias: Noticia[], agenda: JogoAgenda[], ultimos: JogoResultado[]): string {
    const dataAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Ícone padrão caso a imagem falhe
    const fallbackImage = 'https://s2-ge.glbimg.com/filters:format(webp)/g.globo/futebol/escudos/corinthians.svg';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel do Timão | Vai Corinthians</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        timaoBlack: '#0a0a0a',
                        timaoDark: '#121212',
                        timaoGold: '#D4AF37',
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #050505; color: #ffffff; }
        .glass-panel { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .hover-card:hover { transform: translateY(-3px); border-color: #D4AF37; transition: all 0.3s ease; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="antialiased selection:bg-white selection:text-black">

    <header class="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <img src="https://s2-ge.glbimg.com/filters:format(webp)/g.globo/futebol/escudos/corinthians.svg" alt="Corinthians" class="h-10 w-10 drop-shadow-lg">
                <h1 class="text-xl font-bold tracking-tighter uppercase">Painel <span class="text-white/50">Timão</span></h1>
            </div>
            <div class="text-xs text-white/40 font-mono hidden sm:block">
                Atualizado: ${dataAtual}
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8 space-y-12">

        <section>
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold border-l-4 border-white pl-3">Próximos Confrontos</h2>
            </div>
            
            <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                ${agenda.length > 0 ? agenda.map(jogo => `
                <div class="snap-center shrink-0 w-80 sm:w-96 glass-panel rounded-2xl p-6 relative group overflow-hidden">
                    <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <img src="${jogo.escudoCasa || fallbackImage}" class="h-32 w-32 grayscale">
                    </div>
                    <div class="relative z-10">
                        <span class="text-xs font-bold tracking-widest text-timaoGold uppercase mb-2 block">${jogo.liga}</span>
                        <div class="flex justify-between items-center my-4">
                            <div class="flex flex-col items-center gap-2 w-1/3">
                                <img src="${jogo.escudoCasa || fallbackImage}" class="h-12 w-12 object-contain">
                                <span class="text-xs text-center font-semibold truncate w-full">${jogo.casa}</span>
                            </div>
                            <div class="text-2xl font-black text-white/20">VS</div>
                            <div class="flex flex-col items-center gap-2 w-1/3">
                                <img src="${jogo.escudoFora || fallbackImage}" class="h-12 w-12 object-contain">
                                <span class="text-xs text-center font-semibold truncate w-full">${jogo.fora}</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-center gap-2 bg-white/5 py-2 rounded-lg mt-4 border border-white/5">
                            <svg class="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <span class="text-sm font-medium">${jogo.data} • ${jogo.hora}</span>
                        </div>
                    </div>
                </div>
                `).join('') : '<div class="text-gray-500">Nenhum jogo agendado encontrado.</div>'}
            </div>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div class="lg:col-span-2 space-y-6">
                <h2 class="text-2xl font-bold border-l-4 border-white pl-3">Últimas Notícias</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    ${noticias.slice(0, 8).map(news => `
                    <a href="${news.link}" target="_blank" class="block glass-panel rounded-xl overflow-hidden hover-card group">
                        <div class="aspect-video w-full bg-neutral-900 relative overflow-hidden">
                            ${news.imagem 
                                ? `<img src="${news.imagem}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Imagem da notícia">`
                                : `<div class="w-full h-full flex items-center justify-center text-white/10"><svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/></svg></div>`
                            }
                            <div class="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                            <div class="absolute bottom-3 left-3">
                                <span class="text-[10px] font-bold bg-timaoGold text-black px-2 py-0.5 rounded-sm uppercase">GE.Globo</span>
                            </div>
                        </div>
                        <div class="p-4">
                            <h3 class="font-semibold text-lg leading-tight text-gray-100 group-hover:text-white mb-2 line-clamp-2">${news.titulo}</h3>
                            <div class="flex items-center gap-2 text-xs text-gray-400">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                ${news.horario}
                            </div>
                        </div>
                    </a>
                    `).join('')}
                </div>
            </div>

            <div class="space-y-6">
                <h2 class="text-2xl font-bold border-l-4 border-white pl-3">Últimos Resultados</h2>
                <div class="glass-panel rounded-xl p-4 space-y-4">
                    ${ultimos.length > 0 ? ultimos.slice(0, 5).map(res => `
                    <div class="border-b border-white/5 last:border-0 pb-4 last:pb-0">
                        <div class="flex justify-between text-[10px] text-gray-500 uppercase font-bold mb-2">
                            <span>${res.liga}</span>
                            <span>${res.data}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-semibold w-1/3 text-right truncate">${res.casa}</span>
                            <div class="bg-neutral-800 px-3 py-1 rounded text-white font-mono font-bold tracking-widest text-sm mx-2 border border-white/10">
                                ${res.placar}
                            </div>
                            <span class="text-sm font-semibold w-1/3 text-left truncate">${res.fora}</span>
                        </div>
                    </div>
                    `).join('') : '<p class="text-sm text-gray-500">Sem resultados recentes.</p>'}
                </div>

                <div class="mt-8 pt-8 border-t border-white/10 text-center">
                    <p class="text-xs text-gray-500">Desenvolvido com paixão pelo Timão.</p>
                </div>
            </div>

        </div>
    </main>

    <footer class="bg-black py-8 mt-12 border-t border-white/10">
        <div class="max-w-7xl mx-auto px-4 text-center">
             <img src="https://s2-ge.glbimg.com/filters:format(webp)/g.globo/futebol/escudos/corinthians.svg" alt="Corinthians" class="h-16 w-16 mx-auto mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
             <p class="text-gray-600 text-sm">Dados obtidos de fontes públicas (GE & Placar de Futebol).</p>
        </div>
    </footer>
</body>
</html>
    `;
}

// Executa
main();
