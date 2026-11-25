// BOTÃO JOGAR
const botao = document.getElementById("JOGO");

if (botao) {
    botao.addEventListener("click", function() {

        // EFEITO DE TRANSIÇÃO
        document.body.style.transition = "opacity 1s ease";
        document.body.style.opacity = "0";

        setTimeout(function() {

            // PÁGINA PARA ONDE VAI
            window.location.href = "crud/crud.html";

        }, 1000);

    });
}


// BRILHO DAS ESTRELAS AO TOCAR
const estrelas = document.querySelectorAll(".estrela");

estrelas.forEach(function(estrela) {

    estrela.addEventListener("click", function() {

        estrela.classList.add("ativada");

        setTimeout(function() {
            estrela.classList.remove("ativada");
        }, 800);

    });


    // BRILHO AO PASSAR O MOUSE
    estrela.addEventListener("mouseenter", function() {

        estrela.style.textShadow =
            "0 0 15px white, 0 0 30px yellow, 0 0 50px white";

    });

    estrela.addEventListener("mouseleave", function() {

        estrela.style.textShadow =
            "0 0 5px white, 0 0 12px white, 0 0 20px white";

    });

});
