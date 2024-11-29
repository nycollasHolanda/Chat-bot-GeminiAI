const formularioMensagem = document.querySelector(".prompt__form");
const containerHistoricoDeChats = document.querySelector(".chats");

const botaoDeLimparChats = document.getElementById("botaoLimpar");

let mensagemUsuarioAtual = null;
let gerandoResposta = false;

const GOOGLE_API_KEY = "AIzaSyA4I9fb3CuKxcMRtURM18r2h7NAO5F0AXY";
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`;


const carregarHistoricoChatsSalvos = () => {
    const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    const isLightTheme = localStorage.getItem("themeColor") === "light_mode";

    // Aplica o tema ao corpo do documento
    document.body.classList.toggle("light_mode", isLightTheme);


    containerHistoricoDeChats.innerHTML = '';

    savedConversations.forEach(conversation => {

        const userMessageHtml = `
            <div class="message__content">
                <p class="message__text">${conversation.userMessage}</p>
            </div>
        `;

        const outgoingMessageElement = criarElementoMensagemChat(userMessageHtml, "message--outgoing");
        containerHistoricoDeChats.appendChild(outgoingMessageElement);

        const responseText = conversation.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedApiResponse = marked.parse(responseText);
        const rawApiResponse = responseText;

        const responseHtml = `
            <div class="message__content">
                <p class="message__text"></p>
                <div class="message__loading-indicator hide">
                    <div class="message__loading-bar"></div>
                    <div class="message__loading-bar"></div>
                    <div class="message__loading-bar"></div>
                </div>
            </div>
            <span onClick="copiarMensagemParaAreaTransferencia(this)" class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
        `;

        const incomingMessageElement = criarElementoMensagemChat(responseHtml, "message--incoming");
        containerHistoricoDeChats.appendChild(incomingMessageElement);

        const messageTextElement = incomingMessageElement.querySelector(".message__text");

        exibirEfeitoDigitacao(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement, true);
    });

    document.body.classList.toggle("hide-header", savedConversations.length > 0);
};

const criarElementoMensagemChat = (htmlContent, ...cssClasses) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", ...cssClasses);
    messageElement.innerHTML = htmlContent;
    return messageElement;
}

const exibirEfeitoDigitacao = (rawText, htmlText, messageElement, incomingMessageElement, skipEffect = false) => {
    const copyIconElement = incomingMessageElement.querySelector(".message__icon");
    copyIconElement.classList.add("hide");

    if (skipEffect) {

        messageElement.innerHTML = htmlText;
        hljs.highlightAll();
        adicionarBotaoCopiarAosBlocosCodigo();
        copyIconElement.classList.remove("hide");
        gerandoResposta = false;
        return;
    }

    const wordsArray = rawText.split(' ');
    let wordIndex = 0;

    const typingInterval = setInterval(() => {
        messageElement.innerText += (wordIndex === 0 ? '' : ' ') + wordsArray[wordIndex++];
        if (wordIndex === wordsArray.length) {
            clearInterval(typingInterval);
            gerandoResposta = false;
            messageElement.innerHTML = htmlText;
            hljs.highlightAll();
            adicionarBotaoCopiarAosBlocosCodigo();
            copyIconElement.classList.remove("hide");
        }
    }, 75);
};


const fazerRequisicaoApi = async (incomingMessageElement) => {
    const messageTextElement = incomingMessageElement.querySelector(".message__text");

    try {
        const response = await fetch(API_REQUEST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: mensagemUsuarioAtual }] }]
            }),
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error.message);

        const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error("Invalid API response.");

        const parsedApiResponse = marked.parse(responseText);
        const rawApiResponse = responseText;

        exibirEfeitoDigitacao(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement);

        let savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
        savedConversations.push({
            userMessage: mensagemUsuarioAtual,
            apiResponse: responseData
        });
        localStorage.setItem("saved-api-chats", JSON.stringify(savedConversations));
    } catch (error) {
        gerandoResposta = false;
        messageTextElement.innerText = error.message;
        messageTextElement.closest(".message").classList.add("message--error");
    } finally {
        incomingMessageElement.classList.remove("message--loading");
    }
};

const adicionarBotaoCopiarAosBlocosCodigo = () => {
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach((block) => {
        const codeElement = block.querySelector('code');
        let language = [...codeElement.classList].find(cls => cls.startsWith('language-'))?.replace('language-', '') || 'Text';

        const languageLabel = document.createElement('div');
        languageLabel.innerText = language.charAt(0).toUpperCase() + language.slice(1);
        languageLabel.classList.add('code__language-label');
        block.appendChild(languageLabel);

        const copyButton = document.createElement('button');
        copyButton.innerHTML = `<i class='bx bx-copy'></i>`;
        copyButton.classList.add('code__copy-btn');
        block.appendChild(copyButton);

        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                copyButton.innerHTML = `<i class='bx bx-check'></i>`;
                setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy'></i>`, 2000);
            }).catch(err => {
                console.error("Copy failed:", err);
                alert("Unable to copy text!");
            });
        });
    });
};

const exibirAnimacaoCarregando = () => {
    const loadingHtml = `

        <div class="message__content">
            <p class="message__text"></p>
            <div class="message__loading-indicator">
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
            </div>
        </div>
        <span onClick="copiarMensagemParaAreaTransferencia(this)" class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
    
    `;

    const loadingMessageElement = criarElementoMensagemChat(loadingHtml, "message--incoming", "message--loading");
    containerHistoricoDeChats.appendChild(loadingMessageElement);

    fazerRequisicaoApi(loadingMessageElement);
};

const copiarMensagemParaAreaTransferencia = (copyButton) => {
    const messageContent = copyButton.parentElement.querySelector(".message__text").innerText;

    navigator.clipboard.writeText(messageContent);
    copyButton.innerHTML = `<i class='bx bx-check'></i>`;
    setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy-alt'></i>`, 1000);
};

const processarMensagemEnviada = () => {
    mensagemUsuarioAtual = formularioMensagem.querySelector(".prompt__form-input").value.trim() || mensagemUsuarioAtual;
    if (!mensagemUsuarioAtual || gerandoResposta) return;

    gerandoResposta = true;

    const outgoingMessageHtml = `
        <div class="message__content">
            <p class="message__text"></p>
        </div>
    `;

    // Adiciona a classe 'message--outgoing' para mensagem do usuário
    const outgoingMessageElement = criarElementoMensagemChat(outgoingMessageHtml, "message--outgoing");
    outgoingMessageElement.querySelector(".message__text").innerText = mensagemUsuarioAtual;
    containerHistoricoDeChats.appendChild(outgoingMessageElement);

    formularioMensagem.reset();
    document.body.classList.add("hide-header");
    setTimeout(exibirAnimacaoCarregando, 500);
};


botaoDeLimparChats.addEventListener('click', () => {

    const divDeDelete = document.createElement('div');
    divDeDelete.id = 'confirmarDelete';
    divDeDelete.innerHTML = `
        <p>Deseja mesmo deletar o historico de conversas?</p>
        <div>
        <button id="botaoDeletar">Deletar</button>
        <button id="botaoCancelar">Cancelar</button>
        </div>
    `;

    document.body.appendChild(divDeDelete);

    document.getElementById('botaoDeletar').addEventListener('click', () => {
        localStorage.removeItem("saved-api-chats");
        carregarHistoricoChatsSalvos();
        mensagemUsuarioAtual = null;
        gerandoResposta = false;
        document.body.removeChild(divDeDelete);
    });

    document.getElementById('botaoCancelar').addEventListener('click', () => {
        document.body.removeChild(divDeDelete);
    });
});

formularioMensagem.addEventListener('submit', (e) => {
    e.preventDefault();
    processarMensagemEnviada();
});


carregarHistoricoChatsSalvos();