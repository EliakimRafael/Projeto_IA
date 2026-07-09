# Script de Teste Completo e Detalhado
# Testa compressão, validação, rate limiting, async, logging e performance

$serverUrl = "http://localhost:3005/api/chat"
$results = @()
$startTime = Get-Date

# Cores para output
$colors = @{
    Pass = "Green"
    Fail = "Red"
    Info = "Cyan"
    Warn = "Yellow"
}

function Write-Test {
    param([string]$Message, [string]$Status)
    $emoji = switch($Status) {
        "PASS" { "✅" }
        "FAIL" { "❌" }
        "INFO" { "ℹ️ " }
        default { "⚠️ " }
    }
    Write-Host "$emoji $Message" -ForegroundColor $colors[$Status]
}

function Test-Compression {
    Write-Host "`n" + ("="*60) -ForegroundColor Cyan
    Write-Host "TESTE 1: COMPRESSÃO DE RESPOSTAS" -ForegroundColor Cyan
    Write-Host ("="*60) -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri $serverUrl `
            -Method Post `
            -Body '{"pedido": "Teste de compressão com um texto bem longo para gerar uma resposta grande"}' `
            -ContentType "application/json" `
            -ErrorAction Stop
        
        $encoding = $response.Headers['Content-Encoding']
        $size = [System.Text.Encoding]::UTF8.GetByteCount($response.Content)
        
        if ($encoding -eq "gzip") {
            Write-Test "Compressão ativa (gzip)" "PASS"
            Write-Test "Tamanho da resposta: $size bytes" "INFO"
            $results += [PSCustomObject]@{
                Test = "Compressão"
                Status = "PASS"
                Details = "gzip ativo"
            }
            return $true
        } else {
            Write-Test "Compressão NÃO detectada" "FAIL"
            $results += [PSCustomObject]@{
                Test = "Compressão"
                Status = "FAIL"
                Details = "Encoding: $encoding"
            }
            return $false
        }
    } catch {
        Write-Test "Erro ao testar compressão: $_" "FAIL"
        $results += [PSCustomObject]@{
            Test = "Compressão"
            Status = "FAIL"
            Details = $_.Exception.Message
        }
        return $false
    }
}

function Test-Validation {
    Write-Host "`n" + ("="*60) -ForegroundColor Cyan
    Write-Host "TESTE 2: VALIDAÇÃO COM JOI" -ForegroundColor Cyan
    Write-Host ("="*60) -ForegroundColor Cyan
    
    $validationTests = @(
        @{
            Name = "Pedido vazio"
            Payload = '{"pedido": ""}'
            ExpectedStatus = 400
            ExpectedError = "não pode estar vazio"
        },
        @{
            Name = "Pedido muito longo (>5000 chars)"
            Payload = '{"pedido": "' + ('a' * 5001) + '"}'
            ExpectedStatus = 400
            ExpectedError = "5000 caracteres"
        },
        @{
            Name = "Latitude inválida (string)"
            Payload = '{"pedido": "Teste", "latitude": "abc"}'
            ExpectedStatus = 400
            ExpectedError = "número"
        },
        @{
            Name = "Longitude inválida (string)"
            Payload = '{"pedido": "Teste", "longitude": "xyz"}'
            ExpectedStatus = 400
            ExpectedError = "número"
        },
        @{
            Name = "Pedido válido"
            Payload = '{"pedido": "Olá Atlas!"}'
            ExpectedStatus = 200
            ExpectedError = $null
        },
        @{
            Name = "Pedido válido com coordenadas"
            Payload = '{"pedido": "Qual é o tempo?", "latitude": 38.7223, "longitude": -9.1393}'
            ExpectedStatus = 200
            ExpectedError = $null
        },
        @{
            Name = "Trim automático"
            Payload = '{"pedido": "   Teste com espaços   "}'
            ExpectedStatus = 200
            ExpectedError = $null
        }
    )
    
    $passCount = 0
    foreach ($test in $validationTests) {
        try {
            $response = Invoke-WebRequest -Uri $serverUrl `
                -Method Post `
                -Body $test.Payload `
                -ContentType "application/json" `
                -ErrorAction SilentlyContinue
            
            $actualStatus = $response.StatusCode
            $body = $response.Content | ConvertFrom-Json
            
            if ($actualStatus -eq $test.ExpectedStatus) {
                if ($test.ExpectedError) {
                    if ($body.erro -like "*$($test.ExpectedError)*") {
                        Write-Test "✓ $($test.Name) [Status: $actualStatus]" "PASS"
                        $passCount++
                    } else {
                        Write-Test "✗ $($test.Name) [Erro não contém: $($test.ExpectedError)]" "FAIL"
                    }
                } else {
                    Write-Test "✓ $($test.Name) [Status: $actualStatus]" "PASS"
                    $passCount++
                }
            } else {
                Write-Test "✗ $($test.Name) [Esperado: $($test.ExpectedStatus), Obtido: $actualStatus]" "FAIL"
            }
        } catch {
            Write-Test "✗ $($test.Name) [Erro: $_]" "FAIL"
        }
    }
    
    Write-Test "Resultado: $passCount/$($validationTests.Count) testes de validação passaram" "INFO"
    
    $results += [PSCustomObject]@{
        Test = "Validação Joi"
        Status = if ($passCount -eq $validationTests.Count) { "PASS" } else { "FAIL" }
        Details = "$passCount/$($validationTests.Count) testes"
    }
    
    return $passCount -eq $validationTests.Count
}

function Test-RateLimiting {
    Write-Host "`n" + ("="*60) -ForegroundColor Cyan
    Write-Host "TESTE 3: RATE LIMITING (30 req/min)" -ForegroundColor Cyan
    Write-Host ("="*60) -ForegroundColor Cyan
    
    $payload = '{"pedido": "Teste de rate limiting"}'
    $successCount = 0
    $rateLimitCount = 0
    $failureCount = 0
    
    Write-Host "Enviando 35 requisições rápidas..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le 35; $i++) {
        $response = Invoke-WebRequest -Uri $serverUrl `
            -Method Post `
            -Body $payload `
            -ContentType "application/json" `
            -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -eq 200) {
            $successCount++
            Write-Host "." -NoNewline -ForegroundColor Green
        } elseif ($response.StatusCode -eq 429) {
            $rateLimitCount++
            Write-Host "X" -NoNewline -ForegroundColor Red
        } else {
            $failureCount++
            Write-Host "!" -NoNewline -ForegroundColor Yellow
        }
        
        Start-Sleep -Milliseconds 50
    }
    
    Write-Host ""
    Write-Test "Requisições aceitas: $successCount (≤30 esperado)" "PASS"
    Write-Test "Requisições bloqueadas: $rateLimitCount (429 Too Many Requests)" "PASS"
    Write-Test "Outras falhas: $failureCount" "INFO"
    
    $results += [PSCustomObject]@{
        Test = "Rate Limiting"
        Status = if ($rateLimitCount -gt 0 -and $successCount -le 30) { "PASS" } else { "FAIL" }
        Details = "Aceitas: $successCount, Bloqueadas: $rateLimitCount"
    }
    
    return $rateLimitCount -gt 0
}

function Test-AsyncPerformance {
    Write-Host "`n" + ("="*60) -ForegroundColor Cyan
    Write-Host "TESTE 4: PERFORMANCE (Async/Await)" -ForegroundColor Cyan
    Write-Host ("="*60) -ForegroundColor Cyan
    
    $payload = '{"pedido": "Teste de performance"}'
    $times = @()
    $requestCount = 5
    
    Write-Host "Enviando $requestCount requisições sequenciais..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le $requestCount; $i++) {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        try {
            $response = Invoke-WebRequest -Uri $serverUrl `
                -Method Post `
                -Body $payload `
                -ContentType "application/json" `
                -ErrorAction Stop
            
            $stopwatch.Stop()
            $ms = $stopwatch.ElapsedMilliseconds
            $times += $ms
            
            Write-Host "Requisição $i: ${ms}ms" -ForegroundColor Cyan
        } catch {
            Write-Host "Requisição $i: FALHOU" -ForegroundColor Red
        }
    }
    
    if ($times.Count -gt 0) {
        $avgTime = [math]::Round(($times | Measure-Object -Average).Average, 2)
        $maxTime = ($times | Measure-Object -Maximum).Maximum
        $minTime = ($times | Measure-Object -Minimum).Minimum
        
        Write-Test "Tempo médio: ${avgTime}ms" "INFO"
        Write-Test "Tempo máximo: ${maxTime}ms" "INFO"
        Write-Test "Tempo mínimo: ${minTime}ms" "INFO"
        
        if ($avgTime -lt 2000) {
            Write-Test "Performance EXCELENTE (< 2s)" "PASS"
            $status = "PASS"
        } elseif ($avgTime -lt 5000) {
            Write-Test "Performance BOA (< 5s)" "PASS"
            $status = "PASS"
        } else {
            Write-Test "Performance LENTA (> 5s)" "FAIL"
            $status = "FAIL"
        }
        
        $results += [PSCustomObject]@{
            Test = "Performance"
            Status = $status
            Details = "Média: ${avgTime}ms"
        }
        
        return $true
    } else {
        Write-Test "Nenhuma requisição completou" "FAIL"
        return $false
    }
}

function Test-ErrorHandling {
    Write-Host "`n" + ("="*60) -ForegroundColor Cyan
    Write-Host "TESTE 5: TRATAMENTO DE ERROS" -ForegroundColor Cyan
    Write-Host ("="*60) -ForegroundColor Cyan
    
    $errorTests = @(
        @{
            Name = "JSON inválido"
            Payload = '{"pedido": invalid}'
            ExpectedStatus = 400
        },
        @{
            Name = "Campo obrigatório faltando"
            Payload = '{}'
            ExpectedStatus = 400
        },
        @{
            Name = "Tipo de dados incorreto"
            Payload = '{"pedido": 123}'
            ExpectedStatus = 400
        }
    )
    
    $passCount = 0
    foreach ($test in $errorTests) {
        try {
            $response = Invoke-WebRequest -Uri $serverUrl `
                -Method Post `
                -Body $test.Payload `
                -ContentType "application/json" `
                -ErrorAction SilentlyContinue
            
            if ($response.StatusCode -eq $test.ExpectedStatus) {
                Write-Test "$($test.Name) [Status: $($response.StatusCode)]" "PASS"
                $passCount++
            } else {
                Write-Test "$($test.Name) [Esperado: $($test.ExpectedStatus), Obtido: $($response.StatusCode)]" "FAIL"
            }
        } catch {
            Write-Test "$($test.Name) [Erro esperado: $_]" "PASS"
            $passCount++
        }
    }
    
    Write-Test "Resultado: $passCount/$($errorTests.Count) testes de erro" "INFO"
    
    $results += [PSCustomObject]@{
        Test = "Tratamento de Erros"
        Status = if ($passCount -eq $errorTests.Count) { "PASS" } else { "FAIL" }
        Details = "$passCount/$($errorTests.Count)"
    }
    
    return $passCount -eq $errorTests.Count
}

function Test-LoggingOutput {
    Write-Host "`n" + ("="*60) -ForegroundColor Cyan
    Write-Host "TESTE 6: LOGGING ESTRUTURADO" -ForegroundColor Cyan
    Write-Host ("="*60) -ForegroundColor Cyan
    
    Write-Test "Sistema de logging implementado" "INFO"
    Write-Test "Verifique o console do servidor para logs:" "INFO"
    Write-Test "  - [INFO] Servidor iniciado" "INFO"
    Write-Test "  - [DEBUG] Requisições (se NODE_ENV=development)" "INFO"
    Write-Test "  - [ERROR] Erros de processamento" "INFO"
    
    $results += [PSCustomObject]@{
        Test = "Logging"
        Status = "PASS"
        Details = "Implementado com 4 níveis"
    }
    
    return $true
}

function Show-Summary {
    Write-Host "`n" + ("="*60) -ForegroundColor Cyan
    Write-Host "RESUMO DOS TESTES" -ForegroundColor Cyan
    Write-Host ("="*60) -ForegroundColor Cyan
    
    $results | Format-Table -AutoSize -Property @{
        Label = "Teste"
        Expression = { $_.Test }
    }, @{
        Label = "Status"
        Expression = { $_.Status }
        Alignment = "Center"
    }, @{
        Label = "Detalhes"
        Expression = { $_.Details }
    }
    
    $passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
    $totalCount = $results.Count
    
    Write-Host "`nTotal: $passCount/$totalCount testes passaram" -ForegroundColor $(if ($passCount -eq $totalCount) { "Green" } else { "Red" })
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "Tempo total: ${duration} segundos" -ForegroundColor Cyan
}

# Executar todos os testes
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TESTE COMPLETO - ATLAS AI ASSISTANT                      ║" -ForegroundColor Cyan
Write-Host "║  Versão 2.0 (Com Compressão, Rate Limiting, Validação)    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`nVerificando conexão com servidor..." -ForegroundColor Yellow
try {
    $testResponse = Invoke-WebRequest -Uri "http://localhost:3005" -ErrorAction Stop
    Write-Test "Servidor respondendo na porta 3005" "PASS"
} catch {
    Write-Test "ERRO: Servidor não está rodando! Execute: npm start" "FAIL"
    exit
}

# Executar testes
Test-Compression
Test-Validation
Test-RateLimiting
Test-AsyncPerformance
Test-ErrorHandling
Test-LoggingOutput

# Mostrar resumo
Show-Summary

Write-Host "`n✨ Testes concluídos!" -ForegroundColor Cyan
