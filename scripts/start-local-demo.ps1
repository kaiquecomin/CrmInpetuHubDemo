$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
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

try {
    Set-TemporaryEnvironment 'DB_URL' 'jdbc:mysql://localhost:3306/inpetu_connect?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&characterEncoding=UTF-8'
    if (-not $env:DB_USER) { Set-TemporaryEnvironment 'DB_USER' 'root' }
    $dbPassword = Read-LocalSecret 'Senha do MySQL local (Enter se estiver vazia)'
    Set-TemporaryEnvironment 'DB_PASSWORD' $dbPassword
    $dbPassword = $null

    foreach ($account in $accounts) {
        $value = Read-LocalSecret "Senha Passbolt para $($account.Label)" 12 72
        if (-not $passwords.Add($value)) {
            throw 'Use uma senha diferente para cada conta local.'
        }
        $name = "INPETU_DEMO_PASSWORD_$($account.Key)"
        Set-TemporaryEnvironment $name $value
        $value = $null
    }

    $random = [byte[]]::new(48)
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($random) } finally { $generator.Dispose() }
    Set-TemporaryEnvironment 'JWT_SECRET' ([Convert]::ToBase64String($random))
    [Array]::Clear($random, 0, $random.Length)
    Set-TemporaryEnvironment 'SPRING_PROFILES_ACTIVE' 'demo'

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
