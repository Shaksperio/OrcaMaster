# Notas técnicas — integração Google Drive

As orientações oficiais do Google para OAuth 2.0 em aplicações web estão em https://developers.google.com/identity/protocols/oauth2/web-server. O fluxo recomendado para servidor envolve redirecionar o usuário para consentimento, receber um código de autorização no callback e trocá-lo por access token e refresh token; o client secret deve permanecer fora do código público e ser armazenado com segurança. O escopo deve ser mínimo e solicitar apenas as permissões necessárias.

A documentação oficial de upload está em https://developers.google.com/workspace/drive/api/guides/manage-uploads. A API do Drive suporta upload simples, multipart e resumable; bibliotecas oficiais implementam esses fluxos. Para snapshots JSON pequenos, multipart é suficiente; arquivos maiores devem usar resumable. Os arquivos precisam ser versionados e o conteúdo do snapshot deve ser tratado como uma fotografia pontual.

O desenho implementado no OrçaMaster usa a conta Google do próprio usuário, não uma conta central. O estado OAuth é assinado com JWT_SECRET, tokens são cifrados no servidor com AES-GCM, o backup é restrito à empresa ativa, e o Firebase permanece como espelho alternativo. A restauração deve validar formato, versão, empresa e estrutura antes de atualizar o MySQL e depois sincronizar o estado válido para o Firebase.

A orientação de atualizações periódicas está em https://developers.google.com/identity/protocols/oauth2/web-server e no skill local de atualizações periódicas. Não usar setInterval ou node-cron em processos autoscale; rotinas duráveis devem usar callback /api/scheduled/* com Heartbeat. Cada exportação automática é uma fotografia pontual e não substitui o backup oficial do projeto Manus.
