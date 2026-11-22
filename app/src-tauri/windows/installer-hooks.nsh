; ADR 034: el programa nunca comparte carpeta con el historial.
; Tauri instala por defecto en %LOCALAPPDATA%\ARGUS, que es donde el motor guarda el historial.
; Los textos van sin tildes porque makensis lee este archivo aparte de la plantilla.

!define ARGUS_DATA_FOLDER "$LOCALAPPDATA\ARGUS"
!define ARGUS_PROGRAM_FOLDER "$LOCALAPPDATA\Programs\ARGUS"
!define ARGUS_TASKBAR_PINS "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
!define ARGUS_RELEASE_ATTEMPTS 40
!define ARGUS_RELEASE_PAUSE_MS 500

!macro ARGUS_AVOID_DATA_FOLDER
  ${If} $INSTDIR == "${ARGUS_DATA_FOLDER}"
  ${OrIf} $INSTDIR == "${ARGUS_DATA_FOLDER}\"
    StrCpy $INSTDIR "${ARGUS_PROGRAM_FOLDER}"
  ${EndIf}
!macroend

; Con asistente: la pagina de carpeta ya muestra la carpeta correcta.
!define MUI_CUSTOMFUNCTION_GUIINIT ArgusShowProgramFolder
Function ArgusShowProgramFolder
  !insertmacro ARGUS_AVOID_DATA_FOLDER
FunctionEnd

; Cerrar la app no cierra el motor al instante: se espera a que suelte sus archivos.
!macro ARGUS_WAIT_FOR_OLD_ENGINE
  StrCpy $R8 0
  ${DoWhile} $R8 < ${ARGUS_RELEASE_ATTEMPTS}
    Delete "${ARGUS_DATA_FOLDER}\engine\argus-engine.exe"
    ${IfNot} ${FileExists} "${ARGUS_DATA_FOLDER}\engine\argus-engine.exe"
      ${ExitDo}
    ${EndIf}
    Sleep ${ARGUS_RELEASE_PAUSE_MS}
    IntOp $R8 $R8 + 1
  ${Loop}
!macroend

; Hasta la 0.1.2 el programa quedaba junto al historial. Lo quita su propio desinstalador, que solo
; borra los archivos que instalo: aqui no se borra ninguna carpeta con su contenido.
!macro ARGUS_REMOVE_PROGRAM_FROM_DATA_FOLDER
  ${If} ${FileExists} "${ARGUS_DATA_FOLDER}\uninstall.exe"
    !insertmacro CheckIfAppIsRunning "${ARGUS_DATA_FOLDER}\${MAINBINARYNAME}.exe" "${PRODUCTNAME}"
    !insertmacro ARGUS_WAIT_FOR_OLD_ENGINE
    ; /UPDATE conserva accesos directos y datos; _?= espera a que termine y va al final, sin comillas.
    ExecWait '"${ARGUS_DATA_FOLDER}\uninstall.exe" /S /UPDATE _?=${ARGUS_DATA_FOLDER}' $R8
    ${IfNot} ${FileExists} "${ARGUS_DATA_FOLDER}\${MAINBINARYNAME}.exe"
      Delete "${ARGUS_DATA_FOLDER}\uninstall.exe"
      RMDir "${ARGUS_DATA_FOLDER}"
    ${EndIf}
  ${EndIf}
!macroend

!macro ARGUS_RETARGET_SHORTCUT shortcut
  !insertmacro IsShortcutTarget "${shortcut}" "${ARGUS_DATA_FOLDER}\${MAINBINARYNAME}.exe"
  Pop $0
  ${If} $0 = 1
    !insertmacro SetShortcutTarget "${shortcut}" "$INSTDIR\${MAINBINARYNAME}.exe"
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro ARGUS_AVOID_DATA_FOLDER
  !insertmacro ARGUS_REMOVE_PROGRAM_FROM_DATA_FOLDER
  SetOutPath $INSTDIR
!macroend

!macro NSIS_HOOK_POSTINSTALL
  !insertmacro ARGUS_RETARGET_SHORTCUT "$DESKTOP\${PRODUCTNAME}.lnk"
  !insertmacro ARGUS_RETARGET_SHORTCUT "$SMPROGRAMS\${PRODUCTNAME}.lnk"
  !insertmacro ARGUS_RETARGET_SHORTCUT "${ARGUS_TASKBAR_PINS}\${PRODUCTNAME}.lnk"
!macroend
