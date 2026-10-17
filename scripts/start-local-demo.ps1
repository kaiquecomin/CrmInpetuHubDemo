$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$localSecretsPath = Join-Path $PSScriptRoot 'local-secrets.ps1'
$secretNames = @()
$originalEnvironment = @{}
$accounts = @(
    @{ Key = 'ADMIN'; Label = 'admin@inpetu.test' },
    @{ Key = 'COORDINATOR'; Label = 'demo.coordenacao@inpetu.test' },
    @{ Key = 'MANAGER'; Label = 'demo.gestor@inpetu.test' },
    @{ Key = 'STAFF'; Label = 'demo.atendimento@inpetu.test' },
    @{ Key = 'CUSTOMER_LABORATORY'; Label = 'ana@laboratorio-lagoa.test' },
    @{ Key = 'CUSTOMER_GOVERNMENT'; Label = 'helena@governo-ufsc-demo.test' },
    @{ Key = 'CUSTOMER_CITY_CREATIVE'; Label = 'marcos@cidade-criativa.test' },
    @{ Key = 'CUSTOMER_STARTUP_ISLAND'; Label = 'bianca@startup-ilha.test' },
    @{ Key = 'CUSTOMER_ACATE'; Label = 'pedro@acate-labs-demo.test' },
    @{ Key = 'CUSTOMER_MARE'; Label = 'julia@mare-sustentavel-demo.test' },
    @{ Key = 'CUSTOMER_PONTE'; Label = 'lucas@ponte-digital-demo.test' },
    @{ Key = 'CUSTOMER_CIDADE_LABORATORIO'; Label = 'marina@cidade-laboratorio-demo.test' },
    @{ Key = 'CUSTOMER_IMPACTO'; Label = 'andre@impacto-ilha-demo.test' }
)
$managedSecretNames = @('DB_PASSWORD', 'DEMO_ADMIN_PASSWORD') + @($accounts | ForEach-Object { "INPETU_DEMO_PASSWORD_$($_.Key)" })
foreach ($name in $managedSecretNames) {
    $originalEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
$secretNames = $managedSecretNames
$passwords = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)

function Read-LocalSecret([string] $prompt, [int] $minimumLength = 0, [int] $maximumLength = 256) {
    $secure = Read-Host -Prompt $prompt -AsSecureString
    $pointer = [IntPtr]::Zero
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        if ($pointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
        }
        $secure.Dispose()
    }
    if ($value.Length -lt $minimumLength -or $value.Length -gt $maximumLength) {
        throw "A senha deve ter entre $minimumLength e $maximumLength caracteres."
    }
    return $value
}

function Set-TemporaryEnvironment([string] $name, [string] $value) {
    if (-not $originalEnvironment.ContainsKey($name)) {
        $originalEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    }
    Set-Item -Path "Env:$name" -Value $value
    if ($secretNames -notcontains $name) { $script:secretNames += $name }
}

function New-TemporarySecret {
    $bytes = [byte[]]::new(48)
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
        return [Convert]::ToBase64String($bytes)
    }
    finally {
        [Array]::Clear($bytes, 0, $bytes.Length)
        $generator.Dispose()
    }
}

try {
    foreach ($name in $managedSecretNames) {
        Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
    }
    if (Test-Path -LiteralPath $localSecretsPath -PathType Leaf) {
        $null = . $localSecretsPath
    }

    Set-TemporaryEnvironment 'DB_URL' 'jdbc:mysql://localhost:3306/inpetu_connect?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8'
    if (-not $env:DB_USER) { Set-TemporaryEnvironment 'DB_USER' 'root' }
    $dbPassword = [Environment]::GetEnvironmentVariable('DB_PASSWORD', 'Process')
    if ([string]::IsNullOrWhiteSpace($dbPassword)) {
        $dbPassword = Read-LocalSecret 'Senha do MySQL local (Enter se estiver vazia)'
    }
    Set-TemporaryEnvironment 'DB_PASSWORD' $dbPassword
    $dbPassword = $null

    foreach ($account in $accounts) {
        $name = "INPETU_DEMO_PASSWORD_$($account.Key)"
        $value = [Environment]::GetEnvironmentVariable($name, 'Process')
        if ([string]::IsNullOrWhiteSpace($value)) {
            $value = Read-LocalSecret "Senha Passbolt para $($account.Label)" 12 72
        }
        elseif ($value.Length -lt 12 -or $value.Length -gt 72) {
            throw "A senha configurada para $($account.Label) deve ter entre 12 e 72 caracteres."
        }
        if (-not $passwords.Add($value)) {
            throw 'Use uma senha diferente para cada conta local.'
        }
        Set-TemporaryEnvironment $name $value
        $value = $null
    }
    Set-TemporaryEnvironment 'DEMO_ADMIN_PASSWORD' ([Environment]::GetEnvironmentVariable('INPETU_DEMO_PASSWORD_ADMIN', 'Process'))

    Set-TemporaryEnvironment 'JWT_SECRET' (New-TemporarySecret)
    Set-TemporaryEnvironment 'OTP_SECRET' (New-TemporarySecret)
    Set-TemporaryEnvironment 'APP_RATE_LIMIT_SECRET' (New-TemporarySecret)
    Set-TemporaryEnvironment 'SPRING_PROFILES_ACTIVE' 'dev,demo'

    Push-Location $repoRoot
    try {
        Write-Host 'Iniciando API local na porta 8080; abra outro terminal e execute npm run dev.'
        & mvn spring-boot:run
        if ($LASTEXITCODE -ne 0) {
            throw "A API local encerrou com código $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    foreach ($name in $secretNames) {
        $previous = $originalEnvironment[$name]
        if ($null -eq $previous) {
            Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
        }
        else {
            Set-Item -Path "Env:$name" -Value $previous
        }
    }
    $passwords.Clear()
}
