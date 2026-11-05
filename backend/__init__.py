"""RetailMind backend package. Bound native numerical threads for serverless runtimes."""
import os
os.environ.setdefault('OMP_NUM_THREADS','1')
os.environ.setdefault('OPENBLAS_NUM_THREADS','1')
os.environ.setdefault('MKL_NUM_THREADS','1')
os.environ.setdefault('LOKY_MAX_CPU_COUNT','2')
