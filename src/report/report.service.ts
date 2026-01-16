import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { TasksService } from 'src/tasks/tasks.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { TaskStatus } from 'src/tasks/entity/task.entity';
import { ProjectsService } from 'src/projects/projects.service';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import PDFDocument from 'pdfkit';
import { B2Service } from 'src/b2/b2.service';
import ChartDataLabels from 'chartjs-plugin-datalabels'; 

@Injectable()
export class ReportService {
  constructor(
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService,
    private readonly b2Service: B2Service,
  ) {}

  async generateAndUploadReport(projectId: string, userId: string, query: ReportQueryDto) {
    const pdfBuffer = await this.createPdfBuffer(projectId, userId, query);
    const cloudPath = `reports/${projectId}/report_${Date.now()}.pdf`;
    const uploadResult = await this.b2Service.uploadBuffer(pdfBuffer, cloudPath, 'application/pdf');
    const link = await this.b2Service.getDownloadUrl(uploadResult.fileName);
    return {
      message: 'Report generated and uploaded successfully',
      fileName: uploadResult.fileName,
      downloadUrl: link,
    };
  }

  async createPdfBuffer(projectId: string, userId: string, query: ReportQueryDto): Promise<Buffer> {
    const project = await this.projectsService.getProjectById(projectId, userId);
    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }
    const tasks = await this.tasksService.getTaskByTimeframe(projectId, query.startDate, query.endDate);
    if (tasks.length === 0) {
      return this.generateEmptyPdf();
    }
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const completionPercentage = Math.round((completedTasks / totalTasks) * 100);

    const pieChartStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0, BACKLOG: 0, CAN_SOLVE: 0 };
    tasks.forEach((task) => pieChartStatus[task.status]++);

    const userStats: Record<string, { completed: number; remaining: number }> = {};
    tasks.forEach((t) => {
      const user = t.assignedTo?.name || 'Unassigned';
      if (!userStats[user]) userStats[user] = { completed: 0, remaining: 0 };
      if (t.status === TaskStatus.DONE) userStats[user].completed++;
      else userStats[user].remaining++;
    });

  
    const chartCanvas = new ChartJSNodeCanvas({ 
        width: 600, 
        height: 400,
        plugins: { modern: [ChartDataLabels] } 
    });

    const pieChartBuffer = await chartCanvas.renderToBuffer({
      type: 'pie',
      data: {
        labels: Object.keys(pieChartStatus),
        datasets: [{ data: Object.values(pieChartStatus), backgroundColor: ['#9E9E9E', '#2196F3', '#4CAF50', '#FF9800', '#E91E63'] }],
      },
      options: {
        plugins: {
          legend: { position: 'right', labels: { font: { size: 14 } } }, 
          datalabels: { 
            color: '#fff',
            formatter: (value, ctx) => {
              const sum = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
              const percentage = Math.round((value * 100) / sum);
              return percentage > 0 ? `${percentage}%` : ''; 
            },
            font: { weight: 'bold', size: 16 }
          }
        }
      } as any
    });


    const maxTasksArray = Object.values(userStats).map(u => u.completed + u.remaining);
    const highestTaskCount = Math.max(...maxTasksArray, 0);
    const suggestedMax = highestTaskCount + 2; 

    const barChartBuffer = await chartCanvas.renderToBuffer({
      type: 'bar',
      data: {
        labels: Object.keys(userStats),
        datasets: [
          { label: 'Completed', data: Object.values(userStats).map(u => u.completed), backgroundColor: '#0e7f11' },
          { label: 'Remaining', data: Object.values(userStats).map(u => u.remaining), backgroundColor: '#b91e13' },
        ],
      },
      options: { 
        plugins: {
          datalabels: { display: false },
        },
        scales: { 
          y: { 
            beginAtZero: true, 
            max: suggestedMax, 
            ticks: { stepSize: 1 } 
          } 
        } 
      }
    });
  
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(24).fillColor('#333').text('PROJECT TASK REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).fillColor('#ae0b11').text(project.name.toUpperCase(), { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(12).fillColor('#000');
      doc.text(`Total Tasks: ${totalTasks}`);
      doc.text(`Completed Tasks: ${completedTasks}`);
      doc.text(`Overall Completion: ${completionPercentage}%`);
      doc.moveDown(2);
    
      doc.fontSize(18).text('Task Status Distribution', { underline: true , align: 'center' });
      doc.moveDown();
      doc.image(pieChartBuffer, { align: 'center', width: 450 });
      doc.moveDown(2);
      
      doc.addPage();
      doc.fontSize(18).text('User Performance Summary', { underline: true , align: 'center' });
      doc.moveDown();
      doc.image(barChartBuffer, { align: 'center', width: 450 });
      doc.moveDown(2);

      doc.fontSize(18).text('Detailed Task Breakdown', { underline: true , align: 'center' });
      doc.moveDown();

      const groupedTasks = tasks.reduce((account, task) => {
        const user = task.assignedTo?.name || 'Unassigned';
        if (!account[user]) account[user] = [];
        account[user].push(task);
        return account;
      }, {} as Record<string, typeof tasks>);

      for (const [user, userTasks] of Object.entries(groupedTasks)) {
        doc.x = 50; 
        doc.fontSize(12).fillColor('#ae0b11').text(`User: ${user}`);
        doc.moveDown(1);

        const tableTop = doc.y;
        doc.fontSize(10).fillColor('#333');
        
        doc.text('ID', 50, tableTop, { width: 50 });
        doc.text('Title', 100, tableTop, { width: 180 });
        doc.text('Status', 280, tableTop, { width: 80 });
        doc.text('Priority', 360, tableTop, { width: 70 });
        doc.text('Severity', 430, tableTop, { width: 70 });

        doc.moveTo(50, doc.y + 2).lineTo(550, doc.y + 2).stroke();
        doc.moveDown(1);

        userTasks.forEach((task) => {
          const y = doc.y;
          doc.fontSize(9).fillColor('#444');
          doc.text(task.taskId.slice(0, 5), 50, y, { width: 50 });
          doc.text(task.title, 100, y, { width: 180 });
          doc.text(task.status, 280, y, { width: 80 });
          doc.text(task.priority, 360, y, { width: 70 });
          doc.text(task.severity, 430, y, { width: 70 });
          doc.moveDown(1);

          if (doc.y > 700) {
            doc.addPage();
            doc.x = 50; 
          }
        });
        doc.moveDown(2);
      }
      doc.end();
    });
  }
  private generateEmptyPdf(): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.fontSize(20).text('No data found for this project/timeframe.');
      doc.end();
    });
  }
}