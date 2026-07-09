# Testes Complexos - Guia Completo

## 🚀 Visão Geral

Você tem **2 scripts de teste profissionais**:

1. **`teste-completo.ps1`** - PowerShell (Windows) ⭐ Recomendado
2. **`teste-completo.sh`** - Bash/Shell (Linux/Mac)

Ambos testam:
- ✅ Compressão de respostas
- ✅ Validação com Joi
- ✅ Rate limiting
- ✅ Performance/Async
- ✅ Tratamento de erros
- ✅ Logging

---

## 📋 PRÉ-REQUISITOS

1. **Servidor rodando:**
```bash
npm install
npm start
```

2. **Terminal novo** (para executar os testes)

---

## 🏃 EXECUTAR TESTES (Windows PowerShell)

### Opção 1: Simples (Executar diretamente)
```powershell
cd "c:\Users\Eliakimm\Desktop\Documentos sobre programação\Teste de IA Eliakim\Projeto_IA"
.\teste-completo.ps1
```

### Opção 2: Com Permissão Explícita
```powershell
powershell -ExecutionPolicy Bypass -File teste-completo.ps1
```

### Opção 3: Executar com output mais detalhado
```powershell
.\teste-completo.ps1 | Tee-Object -FilePath resultados.txt
```

---

## 🏃 EXECUTAR TESTES (Linux/Mac - Bash)

```bash
cd Projeto_IA
chmod +x teste-completo.sh
./teste-completo.sh
```

---

## 📊 EXEMPLO DE OUTPUT

```
╔════════════════════════════════════════════════════════════╗
║  TESTE COMPLETO - ATLAS AI ASSISTANT                      ║
║  Versão 2.0 (Com Compressão, Rate Limiting, Validação)    ║
╚════════════════════════════════════════════════════════════╝

Verificando conexão com servidor...
✅ Servidor respondendo na porta 3005

════════════════════════════════════════════════════════════
TESTE 1: COMPRESSÃO DE RESPOSTAS
════════════════════════════════════════════════════════════
✅ Compressão ativa (gzip)
ℹ️  Tamanho da resposta: 524 bytes

════════════════════════════════════════════════════════════
TESTE 2: VALIDAÇÃO COM JOI
════════════════════════════════════════════════════════════
✓ Pedido vazio [Status: 400]
✓ Pedido muito longo (>5000 chars) [Status: 400]
✓ Latitude inválida (string) [Status: 400]
✓ Longitude inválida (string) [Status: 400]
✓ Pedido válido [Status: 200]
✓ Pedido válido com coordenadas [Status: 200]
✓ Trim automático [Status: 200]
ℹ️  Resultado: 7/7 testes de validação passaram

════════════════════════════════════════════════════════════
TESTE 3: RATE LIMITING (30 req/min)
════════════════════════════════════════════════════════════
Enviando 35 requisições rápidas...
.............................XXXXX
✅ Requisições aceitas: 30 (≤30 esperado)
✅ Requisições bloqueadas: 5 (429 Too Many Requests)
✅ Outras falhas: 0

════════════════════════════════════════════════════════════
TESTE 4: PERFORMANCE (Async/Await)
════════════════════════════════════════════════════════════
Enviando 5 requisições sequenciais...
Requisição 1: 245ms
Requisição 2: 198ms
Requisição 3: 312ms
Requisição 4: 267ms
Requisição 5: 289ms
✅ Tempo médio: 262.2ms
✅ Tempo máximo: 312ms
✅ Tempo mínimo: 198ms
✅ Performance EXCELENTE (< 2s)

════════════════════════════════════════════════════════════
TESTE 5: TRATAMENTO DE ERROS
════════════════════════════════════════════════════════════
✓ JSON inválido [Status: 400]
✓ Campo obrigatório faltando [Status: 400]
✓ Tipo de dados incorreto [Status: 400]
ℹ️  Resultado: 3/3 testes de erro

════════════════════════════════════════════════════════════
TESTE 6: LOGGING ESTRUTURADO
════════════════════════════════════════════════════════════
ℹ️  Sistema de logging implementado
ℹ️  Verifique o console do servidor para logs:
ℹ️    - [INFO] Servidor iniciado
ℹ️    - [DEBUG] Requisições (se NODE_ENV=development)
ℹ️    - [ERROR] Erros de processamento

════════════════════════════════════════════════════════════
RESUMO DOS TESTES
════════════════════════════════════════════════════════════

Teste                         Status     Detalhes
───────────────────────────────────────────────────────
Compressão                    PASS       gzip ativo
Validação Joi                 PASS       7/7 testes
Rate Limiting                 PASS       Aceitas: 30, Bloqueadas: 5
Performance                   PASS       Média: 262.2ms
Tratamento de Erros           PASS       3/3
Logging                       PASS       Implementado com 4 níveis

Total: 6/6 testes passaram
Tempo total: 15.3 segundos

✨ Testes concluídos!
```

---

## 🔍 O que Cada Teste Valida

### TESTE 1: Compressão
- Verifica header `Content-Encoding: gzip`
- Confirma que respostas estão comprimidas
- Reduz até 80% o tamanho

### TESTE 2: Validação Joi
- **Pedido vazio** → Error 400
- **Pedido muito longo** (>5000 chars) → Error 400
- **Latitude/Longitude inválidas** → Error 400
- **Trim automático** ✓
- **Pedido válido** → Status 200 ✓

### TESTE 3: Rate Limiting
- Permite 30 requisições por minuto
- Bloqueia com 429 (Too Many Requests)
- Mensagem clara de limite atingido

### TESTE 4: Performance
- Mede tempo de resposta (async/await)
- Calcula média, máximo, mínimo
- Excelente < 2s, Bom < 5s

### TESTE 5: Tratamento de Erros
- JSON inválido
- Campos obrigatórios faltando
- Tipos de dados incorretos
- Todos retornam 400 Bad Request

### TESTE 6: Logging
- Níveis: ERROR, WARN, INFO, DEBUG
- Timestamps automáticos
- Aparece no console do servidor

---

## 🎯 TESTES ADICIONAIS MANUAIS

### Teste de Stress (1000 requisições)
```powershell
$payload = '{"pedido": "Teste"}'
$success = 0
$failed = 0

1..1000 | ForEach-Object {
    $resp = Invoke-WebRequest -Uri "http://localhost:3005/api/chat" `
        -Method Post -Body $payload -ContentType "application/json" `
        -ErrorAction SilentlyContinue
    
    if ($resp.StatusCode -eq 200) { $success++ }
    else { $failed++ }
    
    if ($_ % 100 -eq 0) { Write-Host "$_/1000..." }
}

Write-Host "Sucesso: $success, Falhas: $failed"
```

### Teste de Payload Grande
```powershell
$payload = @{ pedido = "Teste " + ("x" * 4000) } | ConvertTo-Json
$response = Invoke-WebRequest -Uri "http://localhost:3005/api/chat" `
    -Method Post -Body $payload -ContentType "application/json"

Write-Host "Status: $($response.StatusCode)"
Write-Host "Tamanho da resposta: $($response.Content.Length) bytes"
```

### Teste de Coordenadas Reais
```powershell
$payload = @{
    pedido = "Qual é o tempo?"
    latitude = 38.7223
    longitude = -9.1393
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3005/api/chat" `
    -Method Post -Body $payload -ContentType "application/json"

$response.Content | ConvertFrom-Json | Select-Object -ExpandProperty resposta
```

---

## 📈 Interpretando Resultados

✅ **TUDO PASSOU** → Seu projeto está ótimo!
- Compressão funcionando
- Validação robusta
- Rate limiting ativo
- Performance excelente
- Tratamento de erros adequado

⚠️ **ALGUNS TESTES FALHARAM** → Verificar:
1. Servidor está rodando? `npm start`
2. Porta 3005 está livre?
3. Dependências instaladas? `npm install`
4. Arquivo `.env` configurado?

❌ **SERVIDOR NÃO RESPONDE** → Executar:
```bash
npm install
npm start
```

---

## 🛠️ Troubleshooting

### Erro: "Servidor não está rodando"
```bash
netstat -ano | findstr :3005  # Verificar porta
npm start                     # Iniciar servidor
```

### Erro: "Permissão negada" no PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\teste-completo.ps1
```

### Erro: Rate Limiting não funciona
- Verificar se está na mesma máquina (localhost)
- Rate limiting é por IP
- Tente 35+ requisições em < 1 minuto

### Erro: Validação não funciona
- Verificar se `joi` está instalado: `npm list joi`
- Reiniciar servidor: `npm start`

---

## 📝 Salvar Resultados

### PowerShell
```powershell
.\teste-completo.ps1 | Out-File resultados-$(Get-Date -f yyyy-MM-dd_HHmm).txt
```

### Bash
```bash
./teste-completo.sh | tee resultados-$(date +%Y-%m-%d_%H%M).txt
```

---

## 🎓 Conclusão

Depois de executar os testes com sucesso:

✅ Seu projeto tem:
- Compressão HTTP (gzip)
- Validação robusta (Joi)
- Rate limiting (proteção)
- Async/await (performance)
- Logging estruturado
- Tratamento de erros
- Testes unitários

**Classificação: 9+/10** ⭐⭐⭐

Parabéns! Seu projeto está em nível profissional! 🚀
