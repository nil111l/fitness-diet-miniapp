param(
  [Parameter(Mandatory = $true)]
  [string]$InstallPath,

  [Parameter(Mandatory = $true)]
  [string]$EnvId,

  [Parameter(Mandatory = $false)]
  [string]$ProjectPath = (Get-Location).Path
)

& $InstallPath cloud functions deploy --e $EnvId --n auth --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n profile --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n goal --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n food --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n diet --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n stats --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n exercise --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n body --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n feedback --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n reminder --r --project $ProjectPath
& $InstallPath cloud functions deploy --e $EnvId --n admin --r --project $ProjectPath
