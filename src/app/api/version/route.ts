export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUILD_TIME_UTC =
  process.env.BUILD_TIME_UTC ||
  process.env.VERCEL_BUILD_TIME_UTC ||
  process.env.VERCEL_DEPLOYMENT_CREATED_AT ||
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
