// Google Analytics Configuration
// This file bypasses Replit's environment variable issues

interface GoogleAnalyticsConfig {
  clientEmail: string;
  privateKey: string;
  viewId: string;
}

// TEMPORARY: Direct credentials (replace with your actual values)
export const getGoogleAnalyticsConfig = (): GoogleAnalyticsConfig => {
  // Try environment variables first
  const clientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY;
  const viewId = process.env.GOOGLE_ANALYTICS_VIEW_ID;

  if (clientEmail && privateKey && viewId) {
    return { clientEmail, privateKey, viewId };
  }

  // Fallback: Manual configuration (you'll need to fill these in)
  return {
    clientEmail: 'climate-watch-analytics@climate-watch-analytics.iam.gserviceaccount.com',
    privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCW4MPWnuTjnt19
ro22emhr/F/wU7Ojn/uo0tpEkB+rs2LaiVV6wbMJwWcbQ7CSAXgCAj8FghTPWMXq
WBOYyh6LCdsbOE/F74GqXVNmpvb1nUQq/54saGv1o6tsMyGon5h5SZQjU9viZyLG
CB4kD91t6kYXrKBqrriQKP86L8ONAOrucc8fAOjrCm90gvLxhjZI5ez6i1HJOAI1
8K/WlHUR7ZdU73gOtkcA85vNAhGAXq1ZBEQReRiRQW1XMLrBRdqKOkPxBzhH7tNj
9JKvoVvIEnzohOMt4BmJUHRcw/1A5SfsR1uyD/dDeNr0rusfS8yXenVwUOkTU059
+gqKgInvAgMBAAECggEAKeMTq5loXUMlJbfYswDvzY7+yZdLR5FqShfjreY/TKlc
N+SpvQ9al8pASEL2GcrbmN8rxOk0ws3YAHPcWO5AJYSidj+fcgnIu1X2igivhkfX
fYKC1LxWwJbkSAE4BnrsVzvUqywkXwoYDteBGqzm4hWIyRjNXmDMb4VaOjq5dQMP
R5+Y5iK7K79KKohfplqCF8rhXa8HL2eaWbUIJQrj9EU/79AwZG9KvE3PYx6sTQ5V
ZKSvQxy1n3/5AiVPM0huVPXZH4JRYMuObT19wWITWp/QHdWG+f63roAPqSCdwB9y
mc6sLriGwu3WibBYBAuIxob5UYo0m0nzQ8R19B7NRQKBgQDT0+IzEWX5Vckh5eBO
IA70RXm966DGkZheqzqHuUprx7jsDIrR2lVh228lxFJ7WpnrGgzHmunWCBHBMUA2
CoVyYi+/LyXK6M4Yrk978mc5+zPs7S4onSrPBZMx8Pkg780VQzCcjNLgBTo8PDsP
yplmB59cx3U2lVE0zUMEOTp/cwKBgQC2VyuHLT9K3RkXchuC3RmEGMgRIxnyt/CL
vN3LZA4BgbzmlnW2pqICcHf6ZnLhvlDOnS37OWsDBSZ2oW3X/ncps0xYQywe0ryI
TIcVjx1KtqvbbI8+jOKobEm0rrE4K626Lv99ITDFyNA9Z1i9miO7Qa2qdjK573gp
m46nees0lQKBgQCnLM+WUiLSlpt3/z35Kl/i9HnSI4XtcLZ58FTvDJLpYORWlsdw
Owmrg0zC15/o7mYPH636Ug499nxcpgvxGnia/1aDYihHbVhKLjdYsMQ7BD/EuqL1
NqS0Ycf7YBydm+OU5kQVKSa72iRNqZNLMS/DUDy7MkcVXt6J93zudmPudQKBgFo8
n3UBRm5VJuK8fLLxmnwOC4y3k1LUBr4Q1K6gMHI8c3CmC1E9+7U7VZTc+IORPMpT
bPsD+lp/RP62evbGntBLRD/11jLW1aiaPsvDjJp59mjbu7QX4t+4320Eev2yWAJo
2dViBJINBEkvCPKkAoTcRwayAf6UbSIiMqHdKzJVAoGBAIOF9/Bxavt4L0EiT/er
Woq/Dzu8eEJfjonHGfCV+XDlS/29v8lJiMRsOqVeQiHaIq3C2BIXZHQMqS01T5hh
CEmgYw6imgqQolK7kLsQ0kPqgEZNks2FWrd/t81zazCuIvKv+zsMCnMsKv/4x5MN
8rWuKCOco6nIfzZ+1Vt0TfiV
-----END PRIVATE KEY-----`,
    viewId: '325582229'
  };
};