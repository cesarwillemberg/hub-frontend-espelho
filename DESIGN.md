# Marvi Hub — Design System & Product UI Guide

> Documento de referência para projetar, implementar e revisar interfaces do Marvi Hub.
> Ele descreve o produto como está no código em junho de 2026 e estabelece regras para que as próximas telas pareçam parte do mesmo sistema.

## 1. Propósito e escopo

O Marvi Hub é uma plataforma SaaS de gestão para supermercados. A interface deve ajudar operadores, gestores e responsáveis por lojas a perceberem três coisas logo no primeiro contato:

1. A operação inteira está reunida em um único lugar.
2. Informações importantes são fáceis de encontrar e agir sobre elas é seguro.
3. O produto é profissional sem ser frio: direto, humano e feito para o ritmo real do varejo.

Este arquivo é uma especificação de design, não um inventário de rotas. Ele orienta landing page, autenticação, cadastro e as futuras áreas logadas (produtos, estoque, pedidos, promoções, cupons, usuários e permissões).

### Princípios de design

| Princípio | Como aparece na interface |
| --- | --- |
| **Clareza operacional** | Rótulos explícitos, status visíveis, dados escaneáveis e ações principais bem destacadas. |
| **Ação com confiança** | Operações críticas precisam de confirmação, feedback e histórico/auditoria quando aplicável. |
| **Hierarquia antes de decoração** | Cor, tamanho e sombra devem explicar importância; não competir com o conteúdo. |
| **Calor com disciplina** | O vermelho da marca adiciona energia. O restante da tela é neutro, calmo e espaçado. |
| **Responsivo por padrão** | O mesmo fluxo deve funcionar em desktop, tablet e celular sem esconder informações essenciais. |
| **Inclusão prática** | Navegação por teclado, contraste, rótulos e estados não podem depender apenas de cor ou movimento. |

## 2. Direção visual

### Personalidade

O visual combina um produto B2B de gestão com elementos levemente editoriais e artesanais: cartões com rotação discreta, sombras duras curtas e uma cor de acento forte. A linguagem é contemporânea, objetiva e otimista — nunca infantil, excessivamente tecnológica ou genérica.

Use a metáfora visual de uma operação organizada: superfícies limpas, grupos bem delimitados, listas legíveis e poucos pontos de atenção por vez.

### O que manter

- Fundo neutro muito claro e superfícies brancas no tema claro.
- Vermelho Marvi como acento, CTA e foco visual principal.
- Tipografia sem serifa, densa nos títulos e confortável nos textos de leitura.
- Bordas cinza discretas, raios moderados e sombras curtas de baixa opacidade.
- Ícones Font Awesome sólidos para ações e capacidades do produto.
- Ilustrações de varejo/produtos em vez de fotos de banco genéricas.

### O que evitar

- Usar vermelho em vários elementos concorrentes na mesma área.
- Gradientes chamativos, brilho neon, glassmorphism e sombras difusas pesadas.
- Cartões rotacionados em telas transacionais, tabelas, formulários ou dashboards: ali a leitura e o alinhamento prevalecem.
- Letras em caixa alta para textos longos ou comandos complexos.
- Usar apenas ícones para ações ambíguas; ações relevantes devem ter texto.

## 3. Fundamentos visuais

### 3.1 Tokens de cor

Os tokens globais já vivem em `src/app/globals.css`. Ao criar uma interface nova, prefira as variáveis abaixo; não replique valores hexadecimais sem necessidade.

| Token | Claro | Escuro | Uso |
| --- | ---: | ---: | --- |
| `--background` | `#f7f7f8` | `#101014` | Fundo geral da página. |
| `--surface` | `#ffffff` | `#1a1a20` | Cartões, menus, campos e áreas elevadas. |
| `--surface-muted` | `#efeff1` | `#17171c` | Seções alternadas, agrupamentos e estados suaves. |
| `--foreground` | `#111114` | `#f8f8fa` | Texto principal e ícones de alta ênfase. |
| `--muted-foreground` | `#69696f` | `#adadb7` | Texto auxiliar, metadados e descrições. |
| `--border` | `#e5e5e8` | `#303037` | Bordas, divisores e contornos neutros. |
| `--primary` | `#ff201b` | `#ff302c` | CTA principal, links prioritários, foco da marca. |
| `--primary-foreground` | `#ffffff` | `#ffffff` | Conteúdo sobre superfície primária. |
| `--positive` | `#2e9e5b` | `#62ca8b` | Status positivo, disponibilidade e confirmação. |
| `--shadow` | `rgba(17,17,20,.09)` | `rgba(0,0,0,.3)` | Sombras de componentes e menus. |

#### Cores semânticas a consolidar

O projeto ainda não possui tokens globais para erro, aviso, informação e foco. Para novas telas, criar e usar uma família semântica em vez de introduzir valores locais. A recomendação é manter pelo menos `*-foreground`, `*-surface` e `*-border` para cada estado.

| Semântica | Intenção | Regra |
| --- | --- | --- |
| Sucesso | Operação concluída, estoque saudável, sincronização ativa | Verde + texto ou ícone; nunca apenas o verde. |
| Aviso | Atenção, baixo estoque, condição que exige revisão | Âmbar + explicação da consequência. |
| Erro | Falha de validação ou ação não concluída | Vermelho de estado, separado do vermelho de marca quando possível; incluir mensagem acionável. |
| Informação | Contexto adicional, processamento ou orientação | Azul/neutro + texto claro. |

### 3.2 Tipografia

- Família base: `Geist, Arial, sans-serif`.
- Texto principal: `--foreground`.
- Texto secundário: `--muted-foreground`.
- Títulos: peso alto (em geral `720–800`), tracking negativo moderado e entrelinha compacta.
- Corpo: entrelinha aproximada de `1.45–1.60` para leitura confortável.

| Papel | Referência atual | Uso |
| --- | --- | --- |
| Display / hero | `clamp(3rem, 5.1vw, 4.3rem)`, peso `760`, line-height `.98` | Título da landing, apenas uma vez por página. |
| Título de seção | `clamp(2rem, 3.8vw, 3rem)`, peso `720`, line-height `1.06` | Seções principais e headings de alto nível. |
| Título de cartão | `1rem–1.15rem`, peso forte | Benefícios, recursos e módulos. |
| Título de formulário | `1.48rem` ou maior | Login, cadastro e fluxos curtos. |
| Corpo | `.73rem–.97rem` no marketing atual | Descrições, ajuda contextual e conteúdo secundário. Para fluxos densos, não reduzir a legibilidade para caber mais conteúdo. |
| Label / meta | `.65rem–.73rem`, peso `700+` | Labels, navegação, tags e informações auxiliares. |

**Regra para produto logado:** use pelo menos `14px` para textos de operação frequente e `16px` para campos em celular. Os tamanhos muito compactos da landing não devem migrar automaticamente para tabelas, formulários e dados críticos.

### 3.3 Espaçamento, geometria e elevação

O sistema usa uma escala prática baseada em múltiplos de 4 px. Para novas composições, use `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 e 96px`.

| Elemento | Regra atual | Regra para extensões |
| --- | --- | --- |
| Container de conteúdo | `min(100% - 48px, 1120px)` | Manter máximo de `1120px` em marketing; dashboards podem usar largura fluida com margens mínimas de 24 px. |
| Seção desktop | `92px` vertical | Usar `64–96px` conforme densidade. |
| Seção mobile | `65px` vertical | Reduzir respiro sem transformar a tela em uma parede de conteúdo. |
| Botões | altura mínima `46px` | Toque confortável: mínimo de 44 px quando a ação é primária ou isolada. |
| Campo de formulário | altura atual `42px` nas telas auth | Preferir 44–48 px em novos fluxos, especialmente em mobile. |
| Raio de botão | `8–10px` | Controles compactos. |
| Raio de cartão | `18px` | Grupos e superfícies de conteúdo. |
| Raio de painel principal | `22–24px` | Login, cadastro e painéis de destaque. |
| Sombra de marca | deslocamento `3–8px`, sem blur | Reservar para marketing e destaques; evitar nas tabelas do app. |

### 3.4 Ícones e imagens

- Ícones atuais: `@fortawesome/free-solid-svg-icons`.
- O ícone de carrinho representa a marca e aparece em navegação, login e cadastro.
- Ícones devem acompanhar um `aria-hidden="true"` quando o texto já comunica a ação; caso sejam o único conteúdo, fornecer `aria-label` no botão.
- A ilustração atual da hero está em `public/imgs/public/home/logistics_8vri.svg` e deve usar `next/image` com texto alternativo contextual.
- Não use imagens decorativas como substituto de informação operacional.

## 4. Layout responsivo

### Breakpoints existentes

| Faixa | Comportamento |
| --- | --- |
| Até `480px` | Uma coluna; CTAs ocupam toda a largura; grids de recursos viram lista; padding lateral prático. |
| `481–800px` | Uma coluna para hero/benefícios/segurança; menu móvel; cartões em duas colunas quando o espaço permitir. |
| A partir de `801px` | Navegação completa; hero em duas colunas; composição editorial dos recursos; conteúdo centralizado. |

O layout não deve depender somente desses dois limites. Ao criar componentes, teste também em 320 px, 375 px, 768 px, 1024 px e 1440 px. O conteúdo deve reflowar antes de cortar, sobrepor ou exigir zoom.

### Padrões de composição

- **Marketing:** container centralizado, seções arejadas, alternância pontual de fundo e uma ação principal por bloco.
- **Autenticação:** card centralizado; introdução de marca à esquerda e formulário à direita em desktop; empilhamento em telas menores.
- **Produto logado (diretriz):** barra lateral persistente em telas largas, cabeçalho de contexto, área de trabalho fluida e painéis agrupados. Em mobile, navegação em drawer e ações essenciais fixadas quando necessário.
- **Formulários longos:** agrupar por assunto com `fieldset`/`legend`, duas colunas apenas quando houver espaço e uma coluna em mobile.

## 5. Componentes compartilhados

### 5.1 Botão

O componente está em `src/components/ui/button.tsx` e combina variantes via `class-variance-authority`.

| Variante | Papel | Uso apropriado |
| --- | --- | --- |
| `default` | Fundo primário vermelho | Ação principal do bloco: criar conta, salvar, confirmar. |
| `outline` | Fundo de superfície, borda neutra | Ação secundária: entrar, voltar, cancelar em contexto simples. |
| `inverse` | Fundo claro sobre bloco primário | CTA dentro de área vermelha. |
| `ghost` | Sem preenchimento | Controles utilitários: tema, menu, ações de ícone. |
| `compact` | Menor, altura de 38 px | Cabeçalho, controles compactos. |
| `icon` | Quadrado, 36 px | Apenas uma ação muito reconhecível e com rótulo acessível. |

Regras:

- Uma área visual deve ter, em geral, apenas um botão `default`.
- Nunca use `outline` para representar uma ação destrutiva. Criar uma variante específica quando ela existir.
- Estados necessários: padrão, hover, foco visível, pressionado, desabilitado e carregando.
- Em carregamento, preservar o texto/ocupação do botão e impedir clique duplo.
- `asChild` é o padrão para links que recebem aparência de botão; navegação deve usar `Link` quando for rota interna.

### 5.2 Cartão

Classe base: `.mh-card`.

- Superfície `--surface`, borda `--border`, raio `18px`.
- Use padding de 16–32 px conforme o conteúdo.
- O cartão deve agrupar informação relacionada; não transformar cada linha de uma tabela em cartão sem ganho claro de escaneabilidade.
- Na landing, cartões de recursos recebem sombra e rotação muito discreta. Esse é um tratamento editorial, não um componente obrigatório de dados.

### 5.3 Cabeçalho e navegação

O cabeçalho público tem marca à esquerda, navegação âncora no centro, controles de idioma/tema e CTAs à direita. Em até 800 px, a navegação e CTAs entram no menu móvel.

- Marca: carrinho vermelho + `Marvi Hub`.
- Links públicos: Recursos, Benefícios e Segurança.
- CTA de menor prioridade: Entrar. CTA de maior prioridade: Criar conta.
- O botão de menu deve refletir o estado com `aria-expanded` e alternar entre menu e fechar.
- Menus precisam fechar ao navegar e ao pressionar Escape em melhorias futuras.

### 5.4 Seções de conteúdo

- `Section`: contêiner semântico para espaçamento e âncoras.
- `SectionHeading`: eyebrow opcional em caixa alta/vermelho + título de seção.
- Benefícios: lista vertical com borda esquerda primária, título e descrição curta.
- CTA final: bloco vermelho, título amplo e duas ações com contraste claro.
- Rodapé: marca, copyright e grupos curtos de links.

### 5.5 Formulários

Padrão atual nas telas de autenticação:

- Label acima do campo; nunca depender somente de placeholder.
- Campo com borda neutra, fundo branco e foco vermelho com anel de baixa opacidade.
- Ações auxiliares, como “Esqueci minha senha”, ficam junto do contexto que explicam.
- Mostrar/ocultar senha é um botão explícito e acessível.
- Erros aparecem próximos do contexto afetado e em um alerta perceptível (`role="alert"` no login).
- Cadastro agrupa dados de Mercado e Responsável em `fieldset` com `legend` e ícone.

Para novos formulários, aplicar também:

1. Validar no cliente para feedback rápido e no servidor como fonte de verdade.
2. Mostrar erro ao lado/abaixo do campo, com `aria-describedby` e mensagem específica.
3. Preservar dados digitados após erro de rede ou validação.
4. Informar quando um campo é opcional — não usar asterisco sem legenda.
5. Para ações irreversíveis, explicar impacto antes da confirmação.

## 6. Telas e jornadas atuais

### 6.1 Landing page (`/`)

| Ordem | Bloco | Objetivo | Conteúdo / tratamento |
| ---: | --- | --- | --- |
| 1 | Header | Navegar e converter | Marca, âncoras, idioma, tema, Entrar e Criar conta. |
| 2 | Hero | Explicar valor em segundos | “Gestão Inteligente para supermercados”, descrição operacional, dois CTAs e ilustração logística. |
| 3 | Recursos | Tornar a proposta concreta | Seis capacidades: Produtos, Estoque, Pedidos, Promoções, Usuários e Cupons. Usuários é o cartão destacado. |
| 4 | Benefícios | Traduzir recursos em resultados | Lista de cinco ganhos e gráfico decorativo de crescimento. |
| 5 | Segurança | Reduzir risco percebido | Permissões por papel, trilha de auditoria e selo de escudo. |
| 6 | CTA | Converter no fim da leitura | Criar conta ou entrar. |
| 7 | Footer | Encerrar e oferecer rotas institucionais | Marca, copyright e grupos Legal, Suporte, Empresa e Recursos. |

Regras de conteúdo para a landing:

- O título deve prometer uma transformação clara, não uma lista de funcionalidades.
- Descrições devem citar o problema resolvido e o contexto de varejo.
- Cada seção deve ter uma ideia central; não empilhar muitos CTAs concorrentes.
- O gráfico de benefícios é decorativo hoje: não representar métricas reais sem dados e legenda adequados.

### 6.2 Login (`/login`)

**Estrutura:** cartão dividido em duas colunas no desktop.

- **Painel de marca:** logo, proposta de valor e quatro capacidades (Produtos, Pedidos, Estoque e Promoções).
- **Painel de acesso:** seletor de idioma/tema, título, e-mail, senha, lembrar-me, recuperação de acesso e CTA Entrar.
- **Feedback atual:** o envio é demonstrativo e mostra erro de credenciais. Ao integrar autenticação, substituir por estados reais: carregando, erro de credenciais, erro de rede, bloqueio/rate limit e sucesso/redirecionamento.
- **Acesso alternativo:** link para criar mercado.

### 6.3 Cadastro (`/criar-conta`)

**Estrutura:** cartão dividido em introdução de produto e formulário em grupos.

- Grupo **Mercado**: nome, slug opcional, CNPJ e e-mail de contato.
- Grupo **Responsável**: nome, e-mail e senha.
- O CNPJ recebe máscara visual enquanto a pessoa digita; a validação de formato/dígitos e a verificação de cadastro ainda precisam estar no fluxo conectado ao backend.
- O formulário atual é propositalmente livre de integração. Não indicar conta criada até que a API confirme sucesso.
- Links de Termos, Privacidade e Suporte devem apontar para rotas reais antes de publicação.

## 7. Temas e internacionalização

### Tema

`next-themes` controla o tema por uma classe `.dark` no elemento raiz e respeita a preferência do sistema inicialmente. O controle manual alterna claro/escuro.

- Toda superfície nova deve usar os tokens globais, especialmente `background`, `surface`, `foreground`, `muted-foreground` e `border`.
- Evitar hexadecimais locais nas páginas de autenticação: elas hoje são predominantemente claras e devem ser revisadas para acompanhar o tema escuro sem perder contraste.
- Testar contraste, bordas, sombras, ilustrações e logos nos dois modos.

### Idiomas

Idiomas disponíveis: `pt-BR` (padrão), `en` e `es`. O idioma selecionado é persistido em `localStorage` com a chave `marvi-hub-language`.

Regras:

- Todo texto novo que aparece para a pessoa usuária deve ficar nos arquivos de locale em `src/lib/i18n/locales/`.
- Não montar frases concatenando traduções; usar interpolação e chaves completas.
- Atualizar as três traduções no mesmo pull request.
- Conferir expansão de texto em inglês/espanhol: botões e cards não podem cortar conteúdo.
- O cadastro ainda possui texto estático em português; migrá-lo para i18n antes de tratar a rota como internacionalizada.

## 8. Movimento e microinterações

O projeto utiliza `motion` e `animejs` em componentes de entrada/scroll. O movimento deve orientar a atenção, não atrasar trabalho.

- Cards de marketing podem elevar `1–4px` no hover.
- Ícones da marca podem receber pequena rotação/translação no hover.
- Revelações no scroll devem ser discretas, rápidas e sem esconder conteúdo funcional.
- Respeitar `prefers-reduced-motion`: pessoas que reduziram movimento devem receber uma versão sem deslocamento/entrada perceptível.
- Não animar validação de campo de modo que cause salto de layout; reservar área para mensagens quando possível.
- Não usar movimento como único sinal de sucesso, erro ou atualização de dados.

## 9. Acessibilidade e qualidade de interface

### Requisitos mínimos

- Um único `h1` por página e ordem lógica de headings.
- Foco visível em links, botões, inputs, menus e controles de ícone.
- Todo botão somente com ícone exige nome acessível.
- Campos têm `label` conectado por `htmlFor`/`id`.
- Erros usam texto, sem depender apenas de borda ou cor.
- Menus, modais e drawers precisam fechar por Escape, administrar foco e retornar foco ao disparador.
- As áreas clicáveis devem ter tamanho confortável, sobretudo em celular.
- Ícones e ilustrações decorativas usam `aria-hidden`/`alt=""`; imagens informativas usam `alt` útil.
- Não publicar links com `href="#"` como ações finais; apontar para destino real ou usar botão quando a ação for local.

### Checklist de revisão visual

- [ ] A hierarquia deixa evidente a ação principal em menos de três segundos?
- [ ] O conteúdo continua legível a 200% de zoom e em 320 px de largura?
- [ ] Tema claro e escuro usam tokens e preservam contraste?
- [ ] Todos os estados de botão/campo foram projetados?
- [ ] O fluxo funciona só com teclado?
- [ ] Erros explicam o que aconteceu e como corrigir?
- [ ] O layout suporta os três idiomas sem truncamento?
- [ ] A interface apresenta dados reais, ou deixa claro quando são ilustrativos?

## 10. Diretrizes para as próximas áreas do Hub

As funcionalidades mencionadas na landing indicam os domínios do produto. Ao desenhar a área autenticada, manter a mesma linguagem, porém aumentar a densidade e a previsibilidade operacional.

| Área | Tela base sugerida | Ações prioritárias | Estados que não podem faltar |
| --- | --- | --- | --- |
| Produtos | Lista/tabela + filtros + detalhe | Criar, editar, importar, consultar código de barras | Vazio, busca sem resultado, item inativo, erro de importação. |
| Estoque | Visão geral + lista por SKU/unidade | Ajustar, transferir, inventariar, definir alerta | Baixo estoque, ruptura, inventário em andamento, sincronização atrasada. |
| Pedidos | Lista por status + detalhe de pedido | Criar, aprovar, receber, cancelar | Rascunho, pendente, aprovação negada, recebimento parcial. |
| Promoções | Lista de campanhas + editor de regras | Criar, agendar, pausar, encerrar | Rascunho, ativa, programada, conflito de regra, expirada. |
| Cupons | Lista + métricas + detalhe | Gerar, exportar, desativar | Ativo, esgotado, expirado, uso inválido. |
| Usuários | Tabela de pessoas + permissões | Convidar, alterar papel, revogar acesso | Convite pendente, conta bloqueada, acesso revogado. |
| Auditoria | Timeline filtrável | Filtrar, abrir evento, exportar | Sem eventos, período sem dados, dados carregando. |

Padrões obrigatórios para essas áreas:

1. Contexto antes da ação: título, unidade/loja selecionada e intervalo de dados visíveis.
2. Filtros sempre legíveis e com opção clara de limpar/aplicar.
3. Tabelas precisam de cabeçalho fixo quando longas, estado de loading, vazio e erro.
4. Status combinam texto, cor e, quando útil, ícone.
5. Ações destrutivas ficam visualmente separadas e exigem confirmação proporcional ao impacto.
6. Mudanças relevantes mostram confirmação e, quando cabível, link para desfazer ou consultar o evento de auditoria.

## 11. Implementação e governança

### Arquivos de referência

| Assunto | Local |
| --- | --- |
| Tokens, responsividade e componentes públicos | `src/app/globals.css` |
| Layout raiz e metadados | `src/app/layout.tsx` |
| Landing page | `src/components/home/` |
| Componentes compartilhados | `src/components/shared/` e `src/components/ui/` |
| Login | `src/app/login/` |
| Cadastro | `src/app/criar-conta/` |
| Traduções | `src/lib/i18n/locales/` |
| Tipos e dados de marketing | `src/lib/types/` e `src/lib/data/` |

### Como adicionar uma nova tela

1. Definir a tarefa principal, o estado inicial e os estados de vazio, carregamento, erro e sucesso antes de criar o layout.
2. Compor com tokens e componentes existentes; criar um componente novo apenas se o padrão for reutilizável.
3. Escrever todas as chaves de tradução junto com a interface.
4. Projetar claro e escuro antes de considerar a tela pronta.
5. Verificar keyboard, foco, contraste, tamanhos de toque e comportamento responsivo.
6. Criar ou atualizar teste de componente para comportamentos críticos.

### Dívida de design conhecida

- A landing já usa tokens de tema; login e cadastro ainda têm muitas cores locais e não estão totalmente alinhados ao dark mode.
- Vários CTAs e links institucionais usam `#` como destino provisório.
- Login e cadastro têm interação visual, mas ainda não estão integrados a autenticação/cadastro reais.
- O cadastro ainda não usa as traduções disponíveis no app.
- Ainda faltam tokens semânticos globais e especificação de estados de tabelas, badges, alertas, modais e toasts.
- O gráfico da landing é decorativo; não deve ser interpretado como métrica de produto.

## 12. Referências

Este documento adota a ideia de um `DESIGN.md` como contrato legível entre produto, design e desenvolvimento. Para o formato e evolução desse tipo de arquivo, consulte:

- [designmd.co](https://www.designmd.co/)
- [getdesign.md](https://getdesign.md/)
- [Design MD overview — Stitch](https://stitch.withgoogle.com/docs/design-md/overview)

Quando a implementação e este documento divergirem, o comportamento testado no produto tem precedência no curto prazo. Atualize este arquivo no mesmo trabalho que alterar uma decisão visual ou de interação de alcance sistêmico.
