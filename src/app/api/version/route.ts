export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * ⚠️ SÓ `NEXT_PUBLIC_*` SOBREVIVE ATÉ AQUI NUM DEPLOY DE CLI.
 *
 * As três primeiras são variáveis de RUNTIME, e a Vercel só as define em
 * deployment criado pela integração Git. O front do Fácies é publicado à mão
 * (`vercel --prod`, ver `scripts/publicar.mjs`), então nenhuma delas existe — e
 * este endpoint, que existe para responder "o que está no ar?", respondia
 * `unknown` nos dois campos.
 *
 * `NEXT_PUBLIC_*` é diferente: o Next INLINA o literal no bundle durante o
 * build, portanto `--build-env` chega até à resposta. Uma variável sem esse
 * prefixo passada por `--build-env` existe durante o build e desaparece no
 * runtime — que era exatamente a armadilha.
 */
const BUILD_TIME_UTC =
  process.env.BUILD_TIME_UTC ||
  process.env.VERCEL_BUILD_TIME_UTC ||
  process.env.VERCEL_DEPLOYMENT_CREATED_AT ||
  process.env.NEXT_PUBLIC_BUILD_TIME_UTC ||
  "unknown";

function resolveCommitSha(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ||
    "unknown"
  );
}

function resolveEnvironment(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
}

export async function GET() {
  return Response.json(
    {
      commit_sha: resolveCommitSha(),
      build_time_utc: BUILD_TIME_UTC,
      environment: resolveEnvironment(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
