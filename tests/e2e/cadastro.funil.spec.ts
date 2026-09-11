import { expect, test } from "@playwright/test";

/**
 * O funil de criar conta, na borda e na tela.
 *
 * ## O bug que originou esta spec
 *
 * O botão "Criar a minha conta" do fim da landing aponta para `/cadastro`, e
 * `/cadastro` não estava em lista pública nenhuma no guard de borda. Todo
 * visitante anônimo que clicava era redirecionado para
 * `/login?next=%2Fcadastro`: a página de criar conta era inalcançável
 * exatamente para quem não tem conta.
 *
 * O modo de falha é silencioso POR DEFINIÇÃO — um redirect não é erro, não
 * aparece em log e devolve HTTP 200 na página final. Nenhum gate estático pega:
 * o código estava correto, faltava um nome numa lista.
 *
 * E havia uma segunda parede em série: mesmo chegando lá, a tela renderizava o
 * formulário de e-mail incondicionalmente, e produção é google-only — o router
 * de auth local nem é registrado, `POST /auth/signup` responde 404.
 *
 * ## Por que esta spec não precisa do backend
 *
 * As três coisas que ela verifica são decididas antes dele: o redirect é do
 * guard de borda (`src/proxy.ts`, só olha cookie), e `GET /auth/modes` é
 * mockado aqui. Isso é deliberado — as outras specs do smoke caem juntas quando
 * `:8000` está fora, e uma spec que só é verde com backend não protege nada no
 * dia em que o backend estiver instável.
 */

const MODOS = "**/api/auth/modes";

async function comModos(page: import("@playwright/test").Page, local_auth: boolean) {
  await page.route(MODOS, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ local_auth, google: true }),
    });
  });
}

test.describe("Funil de cadastro", () => {
  test("REGRESSÃO: /cadastro abre para quem ainda não tem conta", async ({ page }) => {
    // Sem cookie nenhum: é o estado de quem vem da landing.
    await page.goto("/cadastro");
    await expect(page).toHaveURL(/\/cadastro$/);
    await expect(page.getByRole("heading", { name: /Comece pela sua prova/i })).toBeVisible();
  });

  test("as telas de DEPOIS do login continuam exigindo sessão", async ({ page }) => {
    // `/cadastro` entrou na lista pública como EXATO, não como prefixo. Estas
    // duas gravam identidade do titular e aceite dos documentos vigentes.
    await page.goto("/cadastro/completar");
    await expect(page).toHaveURL(/\/login\?next=%2Fcadastro%2Fcompletar$/);

    await page.goto("/cadastro/aceite");
    await expect(page).toHaveURL(/\/login\?next=%2Fcadastro%2Faceite$/);
  });

  test("sem auth local, a tela não oferece o formulário de e-mail", async ({ page }) => {
    // O regime de PRODUÇÃO: `AUTH_MODE=google`, exigido por
    // `runtime_checks._security_checks`.
    await comModos(page, false);
    await page.goto("/cadastro");

    await expect(page.getByPlaceholder("seu@email.com")).toBeHidden();
    await expect(page.getByPlaceholder("Senha", { exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: "Criar conta" })).toBeHidden();

    // E os documentos ficam acessíveis ANTES de entrar, que é o que o Decreto
    // 7.962/2013 art. 3º exige — aceite só quando houver texto publicado, e
    // enquanto não há, a tela não o inventa (ver `registrar_aceite_do_vigente`).
    await expect(page.getByText(/Leia os Termos de Uso/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Termos de Uso" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Política de Privacidade" })).toBeVisible();

    // A contradição que esta tela já cometeu, nesta sessão: afirmar um aceite
    // que o sistema não pede e não registra, enquanto `/termos` diz "este
    // documento ainda não foi publicado [...] nenhum aceite é pedido".
    await expect(page.getByText(/você aceita os Termos/i)).toBeHidden();
  });

  test("com auth local ligada, o formulário de e-mail aparece", async ({ page }) => {
    // O regime de desenvolvimento e do dual-auth.
    await comModos(page, true);
    await page.goto("/cadastro");

    await expect(page.getByPlaceholder("seu@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("Senha", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar conta" })).toBeVisible();
  });

  test("a área do Google é montada nos dois regimes", async ({ page }) => {
    // `useGoogleSignIn` renderiza dentro de um ref e o efeito NÃO roda de novo
    // quando a resposta de `/auth/modes` chega. Desmontar o contêiner enquanto
    // se espera a resposta deixaria o botão sem onde nascer — e o Google é o
    // ÚNICO caminho em produção.
    //
    // ⚠️ `toBeAttached`, e não `toBeVisible`. O iframe do GSI é renderizado com
    // TAMANHO ZERO quando o `client_id` não é aceito pelo Google — foi o que
    // esta spec encontrou na primeira execução, com o placeholder do
    // `.env.local` local. Vale como aviso operacional: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
    // errado não dá erro, dá um botão invisível. O que este teste protege é o
    // ponto de montagem sobreviver ao render condicional; se o botão APARECE é
    // pergunta de configuração, não de código, e o gate dela é o
    // `validate-web-env` do `vercel_railway_ops`.
    for (const local_auth of [false, true]) {
      await comModos(page, local_auth);
      await page.goto("/cadastro");
      await expect(
        page
          .locator("iframe[src*='accounts.google.com']")
          .or(page.getByRole("button", { name: /Entrar com Google/i })),
      ).toBeAttached();
      await page.unrouteAll();
    }
  });

  /**
   * O outro lado do funil: ENTRAR com a conta de e-mail.
   *
   * ## O bug que originou estes dois testes
   *
   * `/login` oferecia "Prefere e-mail e senha? Criar conta" e nenhum campo. Dava
   * para criar a conta e não dava para voltar — a via de e-mail era de mão
   * única, em produção, por meses.
   *
   * A causa era um garfo: o formulário existia (`LoginForm`, agora apagado) mas
   * era renderizado só quando `NEXT_PUBLIC_GOOGLE_CLIENT_ID` estava AUSENTE.
   * Ou seja, aparecia exatamente onde não importa e faltava exatamente onde
   * importa.
   *
   * ## Por que o teste não existia
   *
   * Porque nenhuma spec afirmava que a tela de ENTRAR oferece a via de e-mail —
   * as duas irmãs acima verificam `/cadastro`, que é a de CRIAR. O invariante
   * violado não tinha guarda, e um caminho de login que desaparece não levanta
   * erro: a tela responde 200 e fica bonita.
   *
   * ⚠️ Estes testes só têm valor porque o garfo caiu. Enquanto ele existia,
   * `.env.local` (com `NEXT_PUBLIC_GOOGLE_CLIENT_ID` vazio) fazia o e2e local
   * exercitar sempre o ramo de desenvolvimento — os campos apareceriam pelo
   * motivo errado, e o teste ficaria verde sobre a tela que produção não serve.
   */
  test("REGRESSÃO: com auth local, /login deixa ENTRAR com e-mail e senha", async ({ page }) => {
    await comModos(page, true);
    await page.goto("/login");

    await expect(page.getByPlaceholder("seu@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("Senha", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();

    // Recuperar a senha é parte da via, não um extra: sem isso, esquecer a senha
    // volta a ser uma conta perdida. É ação inline porque não existe página para
    // PEDIR a redefinição — `/auth/reset-password` consome o token do e-mail.
    await expect(page.getByRole("button", { name: /Esqueci a senha/i })).toBeVisible();

    // "Criar conta" é LINK aqui (vai para `/cadastro`), e era `button` no
    // `LoginForm` apagado — cujos botões chamavam `onSwitchView`, que a página
    // passava como `() => undefined`. Dois controles mortos numa tela de login.
    await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();
  });

  test("sem auth local, /login não oferece campo de e-mail", async ({ page }) => {
    // O regime google-only. Mostrar campos que `POST /auth/login` responderia
    // com 404 é pior que não mostrar: convida a tentar o que não existe.
    await comModos(page, false);
    await page.goto("/login");

    await expect(page.getByPlaceholder("seu@email.com")).toBeHidden();
    await expect(page.getByPlaceholder("Senha", { exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeHidden();

    // O ponto de montagem do Google sobrevive nos dois regimes — é o único
    // caminho aqui, e o teste acima já prende isso para `/cadastro`.
    await expect(
      page
        .locator("iframe[src*='accounts.google.com']")
        .or(page.getByRole("button", { name: /Entrar com Google/i })),
    ).toBeAttached();
  });

  test("a ressalva comercial NÃO aparece na tela de entrada", async ({ page }) => {
    // Decisão do operador, 2026-09-10: a ressalva "não promete aprovação e não
    // vende conteúdo teórico" pertence aos Termos, que é onde ela vincula.
    //
    // ⚠️ Isto NÃO a dispensa das superfícies de OFERTA. Na landing há alegação
    // comercial, e ali ela é exigível (CONAR art. 27, CDC art. 30). Este teste
    // prende só a tela de entrada; se alguém a devolver para cá por engano ao
    // mexer na landing, o vermelho aparece aqui.
    await comModos(page, true);
    await page.goto("/login");

    await expect(page.getByText(/não promete aprovação/i)).toBeHidden();
  });
});
