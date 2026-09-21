// Cloudflare Workers · GitHub OAuth 代理（Sveltia CMS 登录用）
// 部署步骤见 README「二、OAuth 配置」
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. 跳转 GitHub 授权页
    if (url.pathname === "/auth") {
      const redirectUri = `${url.origin}/callback`;
      const state = encodeURIComponent(JSON.stringify({ redirectUri }));
      const gh = new URL("https://github.com/login/oauth/authorize");
      gh.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      gh.searchParams.set("redirect_uri", redirectUri);
      gh.searchParams.set("scope", "repo,user");
      gh.searchParams.set("state", state);
      return Response.redirect(gh.toString(), 302);
    }

    // 2. GitHub 回调：换取 token 并回传给 CMS 窗口
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = JSON.parse(decodeURIComponent(url.searchParams.get("state") || "{}"));
      const redirectUri = state.redirectUri || `${url.origin}/callback`;

      const resp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      });
      const data = await resp.json();
      if (!data.access_token) {
        return new Response("授权失败：" + JSON.stringify(data), { status: 400 });
      }
      const html = `<!doctype html><meta charset="utf-8"><script>
        (function () {
          function recieveMessage(e) {
            console.log("recieveMessage %o", e);
            if (e.origin !== "${url.origin}") return;
            window.opener.postMessage(
              'authorization:github:success:' + JSON.stringify({
                token: "${data.access_token}", provider: "github"
              }),
              e.origin
            );
          }
          window.addEventListener("message", recieveMessage, false);
          window.opener.postMessage("authorizing:github", "${url.origin}");
        })();
      </script>`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    return new Response("Not Found", { status: 404 });
  },
};
