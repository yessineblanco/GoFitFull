from pathlib import Path
import hashlib, json, difflib

ROOT = Path(__file__).resolve().parents[2]
p = ROOT / 'main.tex'
old = p.read_text(encoding='utf-8')
start = old.index('% Cover: university and GoFit image/logo intentionally omitted.')
end = old.index(r'\chapter*{Acknowledgements}', start)
cover = r'''% Cover adapted from the user-supplied ESPRIT English template.
\thispagestyle{empty}
\begin{tikzpicture}[remember picture,overlay]
\node[anchor=north west,inner sep=0] at (current page.north west) {\includegraphics[width=\paperwidth,height=\paperheight]{figures/branding/esprit-cover-background.png}};
\node[anchor=center,inner sep=0,font=\sffamily\bfseries\fontsize{16pt}{19pt}\selectfont] at ($(current page.north west)+(298bp,-151bp)$) {2025 -- 2026};
\node[anchor=west,inner sep=0,font=\sffamily\bfseries\fontsize{12pt}{15pt}\selectfont] at ($(current page.north west)+(310bp,-336bp)$) {INFORMATION TECHNOLOGY};
\node[anchor=center,inner sep=0,text width=365bp,align=center,font=\sffamily\bfseries\fontsize{19pt}{23pt}\selectfont] at ($(current page.north west)+(372bp,-423bp)$) {GoFit\\Complete Fitness Mobile Application,\\Coach Marketplace, and\\Administration Platform};
\node[anchor=north west,inner sep=0,text width=345bp,align=left,font=\sffamily\fontsize{12pt}{16pt}\selectfont] at ($(current page.north west)+(190bp,-505bp)$) {By: \textbf{Yessine Blanco}\\[17pt]Academic supervisor:\\[3pt]\textbf{Wafa Boumaiza}\\[17pt]Corporate Internship Supervisor:\\[3pt]\textbf{Nouar Malek}};
\node[anchor=center,inner sep=0] at ($(current page.north west)+(380bp,-700bp)$) {\includegraphics[width=185bp,height=55bp,keepaspectratio]{figures/branding/antigone-official-logo.png}};
\end{tikzpicture}
\null\clearpage

% Unsigned approval form: replace with the completed, signed scan before submission.
\thispagestyle{empty}
\begingroup
\setstretch{1.1}
\vspace*{1cm}
\noindent Je valide le d\'ep\^ot du rapport PFE relatif \`a l'\'etudiant nomm\'e ci-dessous / I validate the submission of the student's report:

\vspace{1cm}
\noindent Nom \& Pr\'enom / Name \& Surname: \textbf{Yessine Blanco}

\vspace{1.2cm}
\noindent\begin{tabular}{|p{\dimexpr\linewidth-2\tabcolsep-2\arrayrulewidth\relax}|}
\hline
\rule{0pt}{22pt}\textbf{Encadrant Entreprise / Business site Supervisor}\\[10pt]
Nom \& Pr\'enom / Name \& Surname: \textbf{Nouar Malek}\\[12pt]
Cachet \& Signature / Stamp \& Signature\\[3cm]
\hline
\end{tabular}

\vspace{1cm}
\noindent\begin{tabular}{|p{\dimexpr\linewidth-2\tabcolsep-2\arrayrulewidth\relax}|}
\hline
\rule{0pt}{22pt}\textbf{Encadrant Acad\'emique / Academic Supervisor}\\[10pt]
Nom \& Pr\'enom / Name \& Surname: \textbf{Wafa Boumaiza}\\[12pt]
Signature / Signature\\[3cm]
\hline
\end{tabular}

\vspace{1.1cm}
\noindent\textit{Ce formulaire doit \^etre rempli, sign\'e et scann\'e / This form must be completed, signed and scanned.}

\vspace{0.4cm}
\noindent\textit{Ce formulaire doit \^etre introduit apr\`es la page de garde / This form must be inserted after the cover page.}
\par\endgroup
\clearpage

'''
new = old[:start] + cover + old[end:]
assert new[new.index(r'\chapter*{Acknowledgements}'):] == old[end:]
p.write_text(new, encoding='utf-8')
audit = Path(__file__).resolve().parent
(audit/'main-revision.diff').write_text(''.join(difflib.unified_diff(old.splitlines(True), new.splitlines(True), fromfile='before/main.tex', tofile='after/main.tex')), encoding='utf-8')
(audit/'source-check.json').write_text(json.dumps({'specialty':'Information Technology','academicYear':'2025–2026','academicSupervisor':'Wafa Boumaiza','corporateSupervisor':'Nouar Malek','approvalForm':'unsigned; immediately after cover','bodyFromAcknowledgementsUnchanged':True,'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest()}, indent=2), encoding='utf-8')
print('Cover and unsigned form inserted; remaining report source unchanged.')
