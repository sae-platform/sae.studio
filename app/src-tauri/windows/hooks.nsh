!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Configuring SAE.STUDIO.Api as a Windows Service..."
  
  ; Stop and delete the service if it already exists to ensure a clean install
  ExecWait 'sc.exe stop "SAE.STUDIO.Api"'
  ExecWait 'sc.exe delete "SAE.STUDIO.Api"'
  
  ; Create the service using the bundled server executable
  ; We use the original .exe name (SAE.STUDIO.Api.exe) which is copied into $INSTDIR by Tauri resources
  ExecWait 'sc.exe create "SAE.STUDIO.Api" binPath= "\"$INSTDIR\SAE.STUDIO.Api.exe\"" start= auto displayname= "SAE STUDIO Server"'
  
  ; Configure service to recover on failure: restart after 60s
  ExecWait 'sc.exe failure "SAE.STUDIO.Api" reset= 86400 actions= restart/60000/restart/60000/restart/60000'
  
  ; Start the service
  ExecWait 'sc.exe start "SAE.STUDIO.Api"'
  
  DetailPrint "SAE.STUDIO.Api service configuration completed."

  ; Register file associations
  DetailPrint "Registering file associations..."
  !insertmacro RegisterFileExt ".saelabel"   "SAE.STUDIO.saelabel"   "SAE Studio Label Document"
  !insertmacro RegisterFileExt ".saeticket"  "SAE.STUDIO.saeticket"  "SAE Studio Ticket Document"
  !insertmacro RegisterFileExt ".saedocument" "SAE.STUDIO.saedocument" "SAE Studio Document"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Removing SAE.STUDIO.Api Service..."
  ExecWait 'sc.exe stop "SAE.STUDIO.Api"'
  ExecWait 'sc.exe delete "SAE.STUDIO.Api"'

  ; Unregister file associations
  DetailPrint "Unregistering file associations..."
  !insertmacro UnregisterFileExt ".saelabel"   "SAE.STUDIO.saelabel"
  !insertmacro UnregisterFileExt ".saeticket"  "SAE.STUDIO.saeticket"
  !insertmacro UnregisterFileExt ".saedocument" "SAE.STUDIO.saedocument"
!macroend

!macro RegisterFileExt _ext _progid _desc
  WriteRegStr HKLM "Software\Classes\${_ext}" "" "${_progid}"
  WriteRegStr HKLM "Software\Classes\${_progid}" "" "${_desc}"
  WriteRegStr HKLM "Software\Classes\${_progid}\DefaultIcon" "" "$INSTDIR\SAE.STUDIO.APP.exe,0"
  WriteRegStr HKLM "Software\Classes\${_progid}\shell\open\command" "" '"$INSTDIR\SAE.STUDIO.APP.exe" "%1"'
!macroend

!macro UnregisterFileExt _ext _progid
  DeleteRegKey HKLM "Software\Classes\${_ext}"
  DeleteRegKey HKLM "Software\Classes\${_progid}"
!macroend
