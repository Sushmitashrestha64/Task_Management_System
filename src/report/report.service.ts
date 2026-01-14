import { Injectable } from '@nestjs/common';
import { TasksService } from 'src/tasks/tasks.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { TaskStatus } from 'src/tasks/entity/task.entity';
import { ProjectsService } from 'src/projects/projects.service';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import PDFDocument from 'pdfkit';


@Injectable()
export class ReportService {
    constructor(private readonly tasksService: TasksService,
        private readonly projectsService: ProjectsService
    ) {}

    async generateProjectReport(projectId: string, userId: string, query:ReportQueryDto){
    await this.projectsService.getProjectById(projectId, userId);
    const tasks = await this.tasksService.getTaskByTimeframe(
      projectId,
      query.startDate,
      query.endDate,
    );

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE).length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const pieChartStatus ={
      TODO:0,
      IN_PROGRESS:0,
      DONE:0,
      BACKLOG:0,
      CAN_SOLVE:0,
    };
    tasks.forEach(task => pieChartStatus[task.status]++);

    const userStats: Record<string, { completed: number; remaining: number }> = {};
    tasks.forEach(t => {
      const user = t.assignedTo?.name || 'Unassigned';
      if (!userStats[user]) userStats[user] = { completed: 0, remaining: 0 };
      if (t.status === TaskStatus.DONE) userStats[user].completed++;
      else userStats[user].remaining++;
    });

    const chartCanvas = new ChartJSNodeCanvas({ width: 500, height: 300 });

    const pieChartBuffer = await chartCanvas.renderToBuffer({
      type: 'pie',
      data: {
        labels: Object.keys(pieChartStatus),
        datasets: [{ data: Object.values(pieChartStatus), backgroundColor: ['#9E9E9E','#2196F3','#4CAF50','#FF9800','#E91E63'] }],
      },
    });

    const barChartBuffer = await chartCanvas.renderToBuffer({
      type: 'bar',
      data: {
        labels: Object.keys(userStats),
        datasets: [
          { label: 'Completed', data: Object.values(userStats).map(u => u.completed), backgroundColor: '#f09fa6' },
          { label: 'Remaining', data: Object.values(userStats).map(u => u.remaining), backgroundColor: '#afa9f1' },
        ],
      },
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.fontSize(20).text('Project Task Report', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(14).text(`Total Tasks: ${totalTasks}`);
    doc.fontSize(14).text(`Completed Tasks: ${completedTasks}`);
    doc.fontSize(14).text(`Completion Percentage: ${completionPercentage}%`);
    doc.moveDown(2);

    doc.fontSize(16).text('Task Status Distribution', { align: 'center' });
    doc.moveDown();
    doc.image(pieChartBuffer, { align: 'center', fit: [300, 300] });
    
    doc.addPage();
    doc.fontSize(16).text('User-wise Task Completion', { align: 'center' });
    doc.moveDown();
    doc.image(barChartBuffer, { align: 'center', fit: [400, 300] });


    doc.addPage();
    const groupedTasks = tasks.reduce((account, task) => {
      const user = task.assignedTo?.name || 'Unassigned';
      if (!account[user]) account[user] = [];
      account[user].push(task);
      return account;
    }, {} as Record<string, typeof tasks>);

    for (const [user, userTasks] of Object.entries(groupedTasks)) {
      doc.fontSize(14).fillColor('#000').text(user, { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor('#333')
       .text('ID', { continued: true, width: 100 })
        .text('Title', { continued: true, width: 150 })
        .text('Status', { continued: true, width: 100 })
        .text('Priority', { continued: true, width: 80 })
        .text('Severity', { width: 80 });
      doc.moveDown(0.2);

        userTasks.forEach(task => {
            doc.fontSize(10)
           .text(task.taskId.slice(0, 8), { continued: true, width: 100 })
           .text(task.title, { continued: true, width: 150 })
           .text(task.status, { continued: true, width: 100 })
           .text(task.priority, { continued: true, width: 80 })
           .text(task.servirity, { width: 80 });
      });
      doc.moveDown(1);
    }

    doc.end();
    const pdfBuffer = Buffer.concat(buffers);
    return pdfBuffer;
  }
}
