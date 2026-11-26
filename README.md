# Olinpy

Assistente para escritórios de consultoria que atendem empresas de todos os tipos: meio ambiente e licenciamento,
segurança e saúde do trabalho, regularização (alvarás, vigilância sanitária, bombeiros) e sistemas de gestão.

- Login por usuário e senha; os dados do escritório ficam publicados **apenas criptografados** (AES-256-GCM).
  A senha de cada pessoa destrava a chave do escritório (PBKDF2-SHA256, 310 mil iterações). Nenhuma senha é guardada.
- Assistente de IA (Groq ou Gemini, chave gratuita de cada usuário) que consulta prazos, empresas, CNPJ, CNAE e feriados
  e cria tarefas a pedido. Tudo o que a IA escreve é minuta: o técnico revisa e decide.
- Empresas, prazos de todas as áreas, tarefas com cronômetro, automações, vistoria de campo com fotos e GPS,
  propostas, calculadoras (prazos, APP, tanque séptico, UTM), legislação, indicadores e histórico.
- GeoMapa (mapas técnicos para o QGIS) integrado.

Projeto ligado ao Projeto Integrador (SENAC – Técnico em Meio Ambiente) e à rotina da PA Consultoria Ambiental.
