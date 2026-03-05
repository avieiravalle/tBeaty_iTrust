import React from 'react';
import { Card } from './UI';
import { HelpCircle, LayoutDashboard, Calendar, Scissors, Users, Heart, Radar, Settings, KeyRound } from 'lucide-react';

const Section = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => (
  <Card>
    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
      <Icon size={20} className="text-zinc-500" />
      {title}
    </h3>
    <div className="prose prose-sm max-w-none text-zinc-700">
      {children}
    </div>
  </Card>
);

export const HelpView = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-zinc-100 text-black rounded-xl">
          <HelpCircle size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Manual do Sistema</h2>
          <p className="text-zinc-500">Encontre aqui todas as informações para usar o tBeauty.</p>
        </div>
      </div>

      <Section title="Dashboard" icon={LayoutDashboard}>
        <p>A tela principal que oferece uma visão geral da "Saúde Financeira" do seu negócio.</p>
        <ul>
          <li><strong>Faturamento Bruto:</strong> A soma total de todos os agendamentos concluídos no período selecionado.</li>
          <li><strong>Lucro Líquido:</strong> O faturamento bruto menos as comissões e os custos extras.</li>
          <li><strong>Composição das Saídas:</strong> Um gráfico que mostra a proporção de seus custos (comissões, custos extras, etc.).</li>
          <li><strong>Meta Mensal:</strong> Acompanhe o progresso em relação à meta de faturamento que você definiu nas Configurações.</li>
          <li><strong>Desempenho dos Profissionais:</strong> Uma tabela que detalha o faturamento gerado e a comissão estimada para cada colaborador.</li>
          <li><strong>Radar de Oportunidades:</strong> Um atalho para identificar clientes inativos e aniversariantes, além de outras dicas para aumentar seu faturamento.</li>
        </ul>
      </Section>

      <Section title="Agendamentos" icon={Calendar}>
        <p>Gerencie todos os agendamentos da sua loja.</p>
        <ul>
          <li><strong>Listagem:</strong> Visualize todos os agendamentos, com informações de cliente, profissional, serviço e status.</li>
          <li><strong>Novo Agendamento:</strong> Clique em "Novo Agendamento" para abrir o formulário. Selecione o cliente, profissional, data e os serviços desejados.</li>
          <li><strong>Horários Visuais:</strong> O sistema mostrará automaticamente os horários disponíveis em botões, considerando a agenda do profissional, seu horário de pausa e o horário de funcionamento do salão.</li>
          <li><strong>Status:</strong> Marque um agendamento como "Concluído" ou "Cancelado" usando os botões ao lado de cada item pendente.</li>
        </ul>
      </Section>
      
      <Section title="Serviços" icon={Scissors}>
        <p>Cadastre e gerencie todos os serviços oferecidos pelo seu salão.</p>
        <ul>
          <li><strong>Adicionar:</strong> Clique em "Adicionar Serviço" para criar um novo. Preencha nome, preço, duração e categoria.</li>
          <li><strong>Editar/Excluir:</strong> Passe o mouse sobre um serviço para ver os botões de edição e exclusão.</li>
        </ul>
      </Section>

      <Section title="Profissionais" icon={Users}>
        <p>Gerencie sua equipe de colaboradores.</p>
        <ul>
          <li><strong>Adicionar:</strong> Cadastre novos profissionais informando nome, e-mail e comissão padrão. Uma senha segura é gerada automaticamente.</li>
          <li><strong>Editar:</strong> Altere dados como nome, e-mail, comissão padrãora definir comissões específicas para cada serviço, que sobrescrevem a comissão padrão do profissional.</li>
        </ul>
      </Section>

      <Section title="Clientes" icon={Heart}>
        <p>Sua base de clientes em um só lugar.</p>
        <ul>
          <li><strong>Cadastro:</strong> O gestor pode cadastrar novos clientes diretamente pelo botão "Cadastrar Cliente".</li>
          <li><strong>Edição:</strong> Atualize informações como nome, telefone, CEP e data de nascimento.</li>
          <li><strong>Ações Rápidas:</strong>
            <ul>
              <li><strong>Gerar Cobrança:</strong> Crie um QR Code Pix e um código "Copia e Cola" para pagamentos.</li>
              <li><strong>Enviar Mensagem:</strong> Envie mensagens individuais ou para múltiplos clientes selecionados diretamente pelo WhatsApp (requer conexão ativa).</li>
            </ul>
          </li>
        </ul>
      </Section>

      <Section title="Oportunidades" icon={Radar}>
        <p>Uma ferramenta poderosa para ações de marketing direcionadas.</p>
        <ul>
          <li><strong>Clientes Inativos:</strong> Lista clientes que não agendam há mais de 90 dias. Uma ótima oportunidade para uma campanha de reativação.</li>
          <li><strong>Aniversariantes do Mês:</strong> Mostra os clientes que fazem aniversário no mês atual, ideal para oferecer um presente ou desconto especial.</li>
        </ul>
      </Section>

      <Section title="Configurações" icon={Settings}>
        <p>Personalize o sistema para a realidade do seu salão.</p>
        <ul>
          <li><strong>Identidade Visual:</strong> Faça o upload do seu logo e de uma imagem de fundo para a tela de login.</li>
          <li><strong>Cores do Tema:</strong> Escolha as cores primária e secundária que serão aplicadas em todo o sistema.</li>
          <li><strong>Informações Gerais:</strong>
            <ul>
              <li>Defina o nome do salão.</li>
              <li>Informe o número de <strong>WhatsApp para Contato</strong>, que também será usado como chave Pix.</li>
              <li>Defina o <strong>Percentual de Sinal</strong> a ser cobrado nos agendamentos online (ex: 10%). Use 0 para desativar a cobrança de sinal.</li>
              <li>Estabeleça a <strong>Meta Mensal de Faturamento</strong> para o dashboard.</li>
              <li>Configure o <strong>Horário de Abertura e Fechamento</strong> do salão.</li>
              <li>Ative ou desative o <strong>Agendamento Online</strong>. Se desativado, os clientes serão instruídos a ligar para agendar.</li>
            </ul>
          </li>
          <li><strong>Código da Loja:</strong> Visualize o código para compartilhar com novos colaboradores.</li>
          <li><strong>Integração WhatsApp:</strong> Ative o envio de mensagens automáticas escaneando o QR Code com seu celular.</li>
        </ul>
      </Section>

      <Section title="Segurança e Backups" icon={KeyRound}>
        <p>A segurança dos seus dados é nossa prioridade.</p>
        <ul>
          <li><strong>Backups Automáticos:</strong> O sistema realiza um backup automático e seguro do banco de dados todos os dias às 23:58. Isso garante que, em caso de qualquer imprevisto, seus dados possam ser recuperados.</li>
          <li><strong>Prevenção de Corrupção:</strong> O processo de backup é feito "online", o que significa que ele pode ser executado sem interromper o uso do sistema e sem risco de corromper o arquivo de backup.</li>
          <li><strong>Retenção:</strong> Mantemos os backups dos últimos 30 dias para garantir uma janela segura de recuperação.</li>
        </ul>
      </Section>

      <Section title="Portal do Cliente" icon={Heart}>
        <p>O cliente também tem um portal exclusivo para interagir com seu salão.</p>
        <ul>
          <li><strong>Meus Agendamentos:</strong> O cliente pode ver seu histórico, cancelar agendamentos futuros e avaliar serviços concluídos.</li>
          <li><strong>Novo Agendamento:</strong> Permite que o cliente faça um novo agendamento de forma autônoma.
            <ul>
              <li>Após confirmar, será solicitado um <strong>sinal</strong> (percentual definido pelo gestor) do valor via Pix para garantir o horário. Este valor fica como crédito para um futuro agendamento em caso de cancelamento.</li>
            </ul>
          </li>
          <li><strong>Salões:</strong> Uma vitrine com todos os salões da rede, onde o cliente pode favoritar seus preferidos para fácil acesso. Os salões favoritados aparecem primeiro na lista.</li>
          <li><strong>Meus Gastos:</strong> Um extrato financeiro pessoal, com um detalhamento mês a mês dos serviços consumados e agendamentos futuros, permitindo um controle claro dos seus gastos.</li>
        </ul>
      </Section>
    </div>
  );
};